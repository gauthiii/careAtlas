#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/server/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

load_env_value() {
  local key="$1"
  local line value
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

SNOW_INSTANCE="${SNOW_INSTANCE:-$(load_env_value SNOW_INSTANCE)}"
SNOW_USERNAME="${SNOW_USERNAME:-$(load_env_value SNOW_USERNAME)}"
SNOW_PASSWORD="${SNOW_PASSWORD:-$(load_env_value SNOW_PASSWORD)}"

if [[ -z "${SNOW_INSTANCE:-}" || -z "${SNOW_USERNAME:-}" || -z "${SNOW_PASSWORD:-}" ]]; then
  echo "SNOW_INSTANCE, SNOW_USERNAME, and SNOW_PASSWORD are required in server/.env" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for sanitized report output" >&2
  exit 1
fi

BASE_URL="https://${SNOW_INSTANCE}/api/now"
REPORT="/tmp/careatlas_uc3_audit_$(date +%Y%m%d_%H%M%S).md"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

snow_get() {
  local api_path="$1"
  local out_file="$2"
  shift 2
  local code
  code="$(curl -sS -u "${SNOW_USERNAME}:${SNOW_PASSWORD}" \
    -H "Accept: application/json" \
    --get "${BASE_URL}/${api_path}" \
    "$@" \
    -o "$out_file" \
    -w "%{http_code}")"
  printf '%s' "$code"
}

append_json_rows() {
  local file="$1"
  local filter="$2"
  if jq -e '.result' "$file" >/dev/null 2>&1; then
    jq -r "$filter" "$file" >>"$REPORT"
  else
    jq -r '.error.message? // .error.detail? // "No result returned"' "$file" >>"$REPORT"
  fi
}

write_section() {
  printf '\n## %s\n\n' "$1" >>"$REPORT"
}

query_table_count() {
  local table="$1"
  local label="$2"
  local file="$TMP_DIR/count_${table}.json"
  local code
  code="$(snow_get "stats/${table}" "$file" --data-urlencode "sysparm_count=true")"
  if [[ "$code" =~ ^2 ]]; then
    local count
    count="$(jq -r '.result.stats.count // .result.stats.COUNT // "unknown"' "$file")"
    printf '| `%s` | %s | `%s` |\n' "$table" "$count" "$label" >>"$REPORT"
  else
    local err
    err="$(jq -r '.error.message? // .error.detail? // "HTTP error"' "$file" 2>/dev/null)"
    printf '| `%s` | HTTP %s | %s |\n' "$table" "$code" "$err" >>"$REPORT"
  fi
}

query_sample_table() {
  local table="$1"
  local query="$2"
  local fields="$3"
  local limit="${4:-10}"
  local file="$TMP_DIR/sample_${table}.json"
  local code
  code="$(snow_get "table/${table}" "$file" \
    --data-urlencode "sysparm_query=${query}" \
    --data-urlencode "sysparm_fields=${fields}" \
    --data-urlencode "sysparm_limit=${limit}" \
    --data-urlencode "sysparm_display_value=all")"
  printf '\n### `%s` sample\n\n' "$table" >>"$REPORT"
  printf 'HTTP `%s`\n\n' "$code" >>"$REPORT"
  if [[ "$code" =~ ^2 ]]; then
    jq -r '
      (.result // []) as $rows
      | if ($rows|length)==0 then "_No rows returned._"
        else ($rows[] | "- " + (to_entries | map(.key + "=" + ((.value.display_value? // .value.value? // .value // "")|tostring)) | join("; ")))
        end
    ' "$file" >>"$REPORT"
  else
    jq -r '.error.message? // .error.detail? // "HTTP error"' "$file" >>"$REPORT"
  fi
  printf '\n' >>"$REPORT"
}

{
  echo "# CareAtlas UC3 Read-Only ServiceNow Audit"
  echo
  echo "- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "- Instance: \`${SNOW_INSTANCE}\`"
  echo "- User: \`${SNOW_USERNAME}\`"
  echo "- Mode: read-only GET requests only"
} >"$REPORT"

write_section "Core Counts"
echo "| Table | Count / status | Purpose |" >>"$REPORT"
echo "|---|---:|---|" >>"$REPORT"
query_table_count "sn_grc_ai_gov_ai_system" "Governed AI systems"
query_table_count "sn_smart_imp_auto_assessment_action" "Post Assessment Actions"
query_table_count "sn_smart_imp_auto_rule" "Post Assessment Action rules"
query_table_count "sn_risk_definition" "Risk statements / definitions"
query_table_count "sys_properties" "System properties"

write_section "Role Verification"
user_file="$TMP_DIR/sys_user.json"
user_code="$(snow_get "table/sys_user" "$user_file" \
  --data-urlencode "sysparm_query=user_name=${SNOW_USERNAME}" \
  --data-urlencode "sysparm_fields=sys_id,user_name,name,active" \
  --data-urlencode "sysparm_limit=1" \
  --data-urlencode "sysparm_display_value=true")"
echo "User lookup HTTP \`${user_code}\`." >>"$REPORT"
user_sys_id="$(jq -r '.result[0].sys_id // ""' "$user_file" 2>/dev/null)"
if [[ -n "$user_sys_id" ]]; then
  jq -r '.result[0] | "- Found user: `" + (.user_name // "") + "` / " + (.name // "") + " / active=" + ((.active // "")|tostring)' "$user_file" >>"$REPORT"
  role_file="$TMP_DIR/roles.json"
  role_code="$(snow_get "table/sys_user_has_role" "$role_file" \
    --data-urlencode "sysparm_query=user=${user_sys_id}^role.nameINsn_grc_ai_gov.ai_risk_and_compliance_manager,sn_grc_ai_gov.ai_risk_and_compliance_admin,sn_grc_ai_gov.ai_risk_and_compliance_business_user,sn_grc_ai_gov.ai_risk_and_compliance_analyst,sn_ai_asset_mgmt.ai_asset_owner,sn_ai_governance_ai_steward" \
    --data-urlencode "sysparm_fields=role.name,role" \
    --data-urlencode "sysparm_limit=25" \
    --data-urlencode "sysparm_display_value=true")"
  echo "- Role lookup HTTP \`${role_code}\`." >>"$REPORT"
  append_json_rows "$role_file" 'if (.result|length)==0 then "- No target AIRC/AICT roles returned." else (.result[] | "- Role: `" + (."role.name" // .role // "") + "`") end'
else
  echo "- User was not found, so roles were not queried." >>"$REPORT"
fi

write_section "AIRC Properties"
props_file="$TMP_DIR/properties_exact.json"
props_code="$(snow_get "table/sys_properties" "$props_file" \
  --data-urlencode "sysparm_query=nameINsn_grc_ai_gov.ai_system_automated_risk_classification_asmt_ram,sn_grc_ai_gov.aisystem_primary_ram,sn_grc_ai_gov.ai_system_risk_classification_ram" \
  --data-urlencode "sysparm_fields=name,value,description" \
  --data-urlencode "sysparm_display_value=true")"
echo "Exact RAM property lookup HTTP \`${props_code}\`." >>"$REPORT"
append_json_rows "$props_file" 'if (.result|length)==0 then "- No exact RAM properties returned." else (.result[] | "- `" + .name + "` = `" + ((.value // "")|tostring) + "`") end'

props_adv_file="$TMP_DIR/properties_advanced.json"
props_adv_code="$(snow_get "table/sys_properties" "$props_adv_file" \
  --data-urlencode "sysparm_query=nameLIKEadvanced^ORdescriptionLIKEAdvanced Risk Assessments^ORdescriptionLIKEMigrate to Advanced Risk" \
  --data-urlencode "sysparm_fields=name,value,description" \
  --data-urlencode "sysparm_limit=25" \
  --data-urlencode "sysparm_display_value=true")"
echo "" >>"$REPORT"
echo "Advanced Risk migration property discovery HTTP \`${props_adv_code}\`." >>"$REPORT"
append_json_rows "$props_adv_file" 'if (.result|length)==0 then "- No advanced-risk migration-like properties returned." else (.result[] | "- `" + .name + "` = `" + ((.value // "")|tostring) + "` — " + ((.description // "")|tostring)) end'

write_section "AI System Dictionary Fields"
dict_file="$TMP_DIR/ai_system_dict.json"
dict_code="$(snow_get "table/sys_dictionary" "$dict_file" \
  --data-urlencode "sysparm_query=name=sn_grc_ai_gov_ai_system^elementISNOTEMPTY" \
  --data-urlencode "sysparm_fields=element,column_label,internal_type,reference" \
  --data-urlencode "sysparm_limit=500" \
  --data-urlencode "sysparm_display_value=true")"
echo "Dictionary lookup HTTP \`${dict_code}\`." >>"$REPORT"
append_json_rows "$dict_file" '
  [ .result[]
    | select((.element + " " + (.column_label // "")) | test("name|status|state|risk|classification|class|fria|fundamental|assessment|conform|asset|owner|use|purpose|regulat|eu"; "i"))
    | "- `" + .element + "` — " + ((.column_label // "")|tostring) + " / " + ((.internal_type.display_value? // .internal_type.value? // .internal_type // "")|tostring) + (if ((.reference.display_value? // .reference.value? // .reference // "")|tostring) != "" then " / ref `" + ((.reference.display_value? // .reference.value? // .reference // "")|tostring) + "`" else "" end)
  ] | if length==0 then "_No matching fields found._" else .[] end'

write_section "Candidate Triage AI System Records"
query_sample_table "sn_grc_ai_gov_ai_system" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,sys_created_on,sys_updated_on,name,short_description,description,state,status,risk_classification,risk_score,display_name" 10
query_sample_table "sn_grc_ai_gov_ai_system" "123TEXTQUERY321=CareAtlas^ORDERBYDESCsys_updated_on" "sys_id,sys_created_on,sys_updated_on,name,short_description,description,state,status,risk_classification,risk_score,display_name" 10

write_section "Template / Assessment Table Discovery"
tables_file="$TMP_DIR/table_discovery.json"
tables_code="$(snow_get "table/sys_db_object" "$tables_file" \
  --data-urlencode "sysparm_query=nameLIKEassessment^ORlabelLIKEAssessment^ORnameLIKEsmart_imp^ORlabelLIKESmart Assessment^ORDERBYname" \
  --data-urlencode "sysparm_fields=name,label,super_class" \
  --data-urlencode "sysparm_limit=120" \
  --data-urlencode "sysparm_display_value=true")"
echo "Table discovery HTTP \`${tables_code}\`." >>"$REPORT"
append_json_rows "$tables_file" '
  if (.result|length)==0 then "- No assessment/smart tables returned."
  else (.result[] | "- `" + .name + "` — " + ((.label // "")|tostring)) end'

write_section "Delivered Template Name Search"
query_sample_table "sn_smart_imp_assessment_template" "nameLIKEAI impact assessment^ORnameLIKEFRIA^ORnameLIKEEU AI Act^ORnameLIKEHigh-risk" "sys_id,name,state,status,published,active,sys_updated_on" 20
query_sample_table "sn_smart_imp_template" "nameLIKEAI impact assessment^ORnameLIKEFRIA^ORnameLIKEEU AI Act^ORnameLIKEHigh-risk" "sys_id,name,state,status,published,active,sys_updated_on" 20
query_sample_table "asmt_metric_type" "nameLIKEAI impact assessment^ORnameLIKEFRIA^ORnameLIKEEU AI Act^ORnameLIKEHigh-risk" "sys_id,name,active,publish_state,state,sys_updated_on" 20

write_section "EU AI Act Content Discovery"
query_sample_table "sn_compliance_authority_document" "123TEXTQUERY321=EU Artificial Intelligence Act^ORDERBYDESCsys_updated_on" "sys_id,name,short_description,state,status,active,sys_updated_on" 10
query_sample_table "sn_compliance_citation" "123TEXTQUERY321=EU Artificial Intelligence Act^ORDERBYDESCsys_updated_on" "sys_id,name,short_description,active,sys_updated_on" 10

write_section "Post Assessment Actions"
query_sample_table "sn_smart_imp_auto_assessment_action" "123TEXTQUERY321=AI^ORDERBYDESCsys_updated_on" "sys_id,name,active,assessment_template,action_type,target_table,sys_updated_on" 20
query_sample_table "sn_smart_imp_auto_rule" "123TEXTQUERY321=AI^ORDERBYDESCsys_updated_on" "sys_id,name,active,assessment_template,sys_updated_on" 20

write_section "Risk Definition Evidence"
query_sample_table "sn_risk_definition" "nameLIKEAlgorithmic Bias and Discrimination^ORnameLIKEData Bias^ORnameLIKEPrivacy Violations" "sys_id,name,description,state,status,active,sys_updated_on" 20

write_section "Tables Referencing AI Systems"
refs_file="$TMP_DIR/references_ai_system.json"
refs_code="$(snow_get "table/sys_dictionary" "$refs_file" \
  --data-urlencode "sysparm_query=reference=sn_grc_ai_gov_ai_system^elementISNOTEMPTY" \
  --data-urlencode "sysparm_fields=name,element,column_label,internal_type" \
  --data-urlencode "sysparm_limit=100" \
  --data-urlencode "sysparm_display_value=true")"
echo "Reference lookup HTTP \`${refs_code}\`." >>"$REPORT"
append_json_rows "$refs_file" '
  if (.result|length)==0 then "- No tables with direct reference to `sn_grc_ai_gov_ai_system` returned."
  else (.result[] | "- `" + .name + "." + .element + "` — " + ((.column_label // "")|tostring)) end'

echo "$REPORT"

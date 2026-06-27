#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/server/.env"

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

BASE_URL="https://${SNOW_INSTANCE}/api/now"
REPORT="/tmp/careatlas_uc3_detail_$(date +%Y%m%d_%H%M%S).md"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

snow_get() {
  local api_path="$1"
  local out_file="$2"
  shift 2
  curl -sS -u "${SNOW_USERNAME}:${SNOW_PASSWORD}" \
    -H "Accept: application/json" \
    --get "${BASE_URL}/${api_path}" \
    "$@" \
    -o "$out_file" \
    -w "%{http_code}"
}

val_expr='(.value.display_value? // .value.value? // .value // "")'

write_section() {
  printf '\n## %s\n\n' "$1" >>"$REPORT"
}

sample_query() {
  local heading="$1"
  local table="$2"
  local query="$3"
  local fields="$4"
  local limit="${5:-20}"
  local file="$TMP_DIR/${table}_${heading//[^A-Za-z0-9]/_}.json"
  local code
  code="$(snow_get "table/${table}" "$file" \
    --data-urlencode "sysparm_query=${query}" \
    --data-urlencode "sysparm_fields=${fields}" \
    --data-urlencode "sysparm_limit=${limit}" \
    --data-urlencode "sysparm_display_value=all")"
  printf '### %s — `%s`\n\nHTTP `%s`\n\n' "$heading" "$table" "$code" >>"$REPORT"
  if [[ "$code" =~ ^2 ]]; then
    jq -r '
      (.result // []) as $rows
      | if ($rows|length)==0 then "_No rows returned._"
        else $rows[]
          | "- " + (to_entries
            | map(.key + "=" + ((.value.display_value? // .value.value? // .value // "")|tostring))
            | join("; "))
        end
    ' "$file" >>"$REPORT"
  else
    jq -r '.error.message? // .error.detail? // "HTTP error"' "$file" >>"$REPORT"
  fi
  printf '\n' >>"$REPORT"
}

dictionary_query() {
  local table="$1"
  local file="$TMP_DIR/dict_${table}.json"
  local code
  code="$(snow_get "table/sys_dictionary" "$file" \
    --data-urlencode "sysparm_query=name=${table}^elementISNOTEMPTY" \
    --data-urlencode "sysparm_fields=element,column_label,internal_type,reference" \
    --data-urlencode "sysparm_limit=400" \
    --data-urlencode "sysparm_display_value=all")"
  printf '### Dictionary — `%s`\n\nHTTP `%s`\n\n' "$table" "$code" >>"$REPORT"
  if [[ "$code" =~ ^2 ]]; then
    jq -r '
      [ .result[]
        | select(((.element.display_value? // .element.value? // .element // "")|tostring) + " " + (((.column_label.display_value? // .column_label.value? // .column_label // "")|tostring)) | test("name|number|state|status|active|publish|template|assessment|scope|source|task|record|ai|risk|classification|control|asset|system|owner|assigned|opened|complete|result|score|rating|methodology"; "i"))
        | "- `" + (((.element.display_value? // .element.value? // .element // "")|tostring)) + "` — " + ((.column_label.display_value? // .column_label.value? // .column_label // "")|tostring)
          + " / " + ((.internal_type.display_value? // .internal_type.value? // .internal_type // "")|tostring)
          + (if ((.reference.display_value? // .reference.value? // .reference // "")|tostring) != "" then " / ref `" + ((.reference.display_value? // .reference.value? // .reference // "")|tostring) + "`" else "" end)
      ] | if length==0 then "_No matching fields returned._" else .[] end
    ' "$file" >>"$REPORT"
  else
    jq -r '.error.message? // .error.detail? // "HTTP error"' "$file" >>"$REPORT"
  fi
  printf '\n' >>"$REPORT"
}

{
  echo "# CareAtlas UC3 Detailed Read-Only Audit"
  echo
  echo "- Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "- Instance: \`${SNOW_INSTANCE}\`"
  echo "- User: \`${SNOW_USERNAME}\`"
  echo "- Mode: read-only GET requests only"
  echo "- Target: patient-facing Triage candidate \`cdf56dc91bd14b14d7eaea45604bcb6e\`"
} >"$REPORT"

write_section "Template Tables"
dictionary_query "sn_smart_asmt_template"
sample_query "Delivered AI / EU / FRIA templates" "sn_smart_asmt_template" "nameLIKEAI impact assessment^ORnameLIKEFRIA^ORnameLIKEEU AI Act^ORnameLIKEHigh-risk^ORtitleLIKEAI impact assessment^ORtitleLIKEFRIA^ORtitleLIKEEU AI Act^ORtitleLIKEHigh-risk" "sys_id,name,title,state,status,active,published,publish_state,template_status,sys_updated_on" 30
sample_query "Unified assessment templates" "sn_ucm_assessment_template" "nameLIKEEU Artificial Intelligence Act^ORnameLIKEEU AI Act^ORnameLIKEFRIA^ORnameLIKEAI impact" "sys_id,name,state,status,active,published,sys_updated_on" 30

write_section "Assessment Instances / Scope"
dictionary_query "sn_smart_asmt_instance"
dictionary_query "sn_smart_asmt_scope_item"
dictionary_query "sn_smart_asmt_m2m_instance_scope_item"
sample_query "Triage smart assessment instances" "sn_smart_asmt_instance" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,number,name,state,status,assessment_template,template,sys_created_on,sys_updated_on" 20
sample_query "FRIA smart assessment instances" "sn_smart_asmt_instance" "123TEXTQUERY321=Fundamental Rights^OR123TEXTQUERY321=FRIA^ORDERBYDESCsys_updated_on" "sys_id,number,name,state,status,assessment_template,template,sys_created_on,sys_updated_on" 20
sample_query "Triage scope items" "sn_smart_asmt_scope_item" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,name,source_record,source_table,record,table,document,sys_created_on,sys_updated_on" 20

write_section "Triage AI System Related Records"
dictionary_query "sn_grc_ai_gov_ai_system_task"
dictionary_query "sn_grc_ai_gov_risk_assessment_result"
sample_query "AI system task for Triage Appointment DG1" "sn_grc_ai_gov_ai_system_task" "ai_system=cdf56dc91bd14b14d7eaea45604bcb6e^ORDERBYDESCsys_updated_on" "sys_id,number,short_description,state,status,ai_system,assessment,assessment_instance,assigned_to,sys_created_on,sys_updated_on" 30
sample_query "Risk assessment result for Triage Appointment DG1" "sn_grc_ai_gov_risk_assessment_result" "ai_system=cdf56dc91bd14b14d7eaea45604bcb6e^ORDERBYDESCsys_updated_on" "sys_id,ai_system,risk_assessment_methodology,risk_score,risk_rating,state,status,sys_created_on,sys_updated_on" 30
sample_query "Risk assessment result text Triage" "sn_grc_ai_gov_risk_assessment_result" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,ai_system,risk_assessment_methodology,risk_score,risk_rating,state,status,sys_created_on,sys_updated_on" 30
sample_query "AI system entity map for Triage Appointment DG1" "sn_grc_ai_gov_ai_system_entity_map" "ai_system=cdf56dc91bd14b14d7eaea45604bcb6e^ORDERBYDESCsys_updated_on" "sys_id,ai_system,entity,entity_type,sys_created_on,sys_updated_on" 30

write_section "Risk / Control Relationship Discovery"
sample_query "Risk records text Triage" "sn_risk_risk" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,number,name,short_description,state,status,profile,risk_statement,risk_definition,sys_created_on,sys_updated_on" 30
sample_query "Control records text Triage" "sn_compliance_control" "123TEXTQUERY321=Triage^ORDERBYDESCsys_updated_on" "sys_id,number,name,short_description,state,status,profile,control_objective,sys_created_on,sys_updated_on" 30

echo "$REPORT"

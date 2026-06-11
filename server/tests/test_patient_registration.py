import base64
import json
import os
import sys
import unittest
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("SNOW_INSTANCE", "ven04690.service-now.com")
os.environ.setdefault("SNOW_USERNAME", "snow-user")
os.environ.setdefault("SNOW_PASSWORD", "snow-password")

from app.config import get_settings
from app.main import create_app
from app.models import (
    BookingAppointment,
    BookingAvailabilityResponse,
    BookingAppointmentRequest,
    PatientProfileResponse,
    PatientRegistrationRequest,
    PatientRegistrationResponse,
)
from app.servicenow import (
    BookingConflictError,
    BookingPatientNotFoundError,
    ServiceNowError,
    create_patient_booking_appointment,
    create_patient_registration,
    fetch_patient_booking_availability,
    fetch_patient_profile,
)


@dataclass
class FakeSettings:
    snow_instance: str = "ven04690.service-now.com"
    snow_username: str = "interface-account"
    snow_password: str = "interface-password"
    request_timeout: float = 5.0

    @property
    def snow_base_url(self) -> str:
        return f"https://{self.snow_instance}"


def registration_data() -> dict[str, object]:
    return {
        "first_name": "Aisha",
        "last_name": "Evans",
        "date_of_birth": "1981-09-30",
        "gender": "Female",
        "ethnicity": "White",
        "primary_language": "English",
        "phone": "07721130263",
        "email": "aisha.evans77@example.com",
        "address_line1": "1 Demo Street",
        "address_line2": "",
        "city": "London",
        "postcode": "E1 6AA",
        "health_condition": "Preventative care",
        "accessibility": "Yes",
        "insurance_id": "",
        "emergency_name": "Emergency Contact",
        "emergency_phone": "07700000000",
        "emergency_relationship": "Partner",
        "username": "aisha.evans77",
        "consent_accepted": True,
    }


def booking_data() -> dict[str, object]:
    return {
        "email": "aisha.evans77@example.com",
        "username": "aisha.evans77",
        "name": "Aisha Evans",
        "doctor_record_id": "doctor-sys-id",
        "date": "2026-06-09",
        "start_time": "09:00:00",
        "visit_type": "In-person",
        "reason_category": "Urgent concern",
        "specialty": "Cardiology",
        "concern": "Chest discomfort",
        "insurance_provider": "Aetna",
        "member_id": "MEM-100",
        "accessibility": "Wheelchair access",
        "interpreter": "No interpreter",
    }


class PatientRegistrationServiceNowTest(unittest.IsolatedAsyncioTestCase):
    async def test_creates_patient_with_normalized_payload_and_basic_auth(self):
        requests = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                201,
                json={
                    "result": {
                        "sys_id": "patient-sys-id",
                        "u_patient_id": "patient-public-id",
                        "u_first_name": "Aisha",
                        "u_last_name": "Evans",
                        "u_email": "aisha.evans77@example.com",
                        "u_registration_status": "pending",
                    }
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await create_patient_registration(
                FakeSettings(),
                PatientRegistrationRequest(**registration_data()),
                http_client=http_client,
            )

        self.assertEqual(response.sys_id, "patient-sys-id")
        self.assertEqual(response.patient_id, "patient-public-id")
        self.assertEqual(requests[0].url.path, "/api/now/table/u_patient")

        scheme, _, encoded = requests[0].headers["authorization"].partition(" ")
        self.assertEqual(scheme, "Basic")
        self.assertEqual(
            base64.b64decode(encoded).decode(),
            "interface-account:interface-password",
        )

        payload = json.loads(requests[0].content)
        self.assertNotIn("password", json.dumps(payload).lower())
        self.assertEqual(payload["u_gender"], "female")
        self.assertEqual(payload["u_ethnicity"], "white")
        self.assertEqual(payload["u_health_condition"], "preventative")
        self.assertEqual(payload["u_accessibility"], "true")
        self.assertEqual(payload["u_consent_accepted"], "true")
        self.assertEqual(payload["u_registration_status"], "pending")
        self.assertEqual(payload["u_account_status"], "active")
        self.assertEqual(payload["u_profile_complete"], "true")
        self.assertEqual(payload["u_confidence_score"], "100")
        self.assertNotIn("u_address_line2", payload)
        self.assertNotIn("u_insurance_id", payload)

    async def test_non_success_response_raises_servicenow_error(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(403, json={"error": {"message": "Forbidden"}})

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaisesRegex(ServiceNowError, "ServiceNow 403"):
                await create_patient_registration(
                    FakeSettings(),
                    PatientRegistrationRequest(**registration_data()),
                    http_client=http_client,
                )


class PatientProfileServiceNowTest(unittest.IsolatedAsyncioTestCase):
    async def test_fetches_profile_by_email_first(self):
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                200,
                json={
                    "result": [
                        {
                            "sys_id": "patient-sys-id",
                            "sys_created_on": "2024-01-12",
                            "sys_updated_on": "2026-06-04 18:08:29",
                            "u_patient_id": "NGH-200",
                            "u_first_name": "Aisha",
                            "u_last_name": "Evans",
                            "u_date_of_birth": "1981-09-30",
                            "u_gender": {"value": "female", "display_value": "Female"},
                            "u_ethnicity": "White",
                            "u_primary_language": "English",
                            "u_phone": "07721130263",
                            "u_email": "aisha.evans77@example.com",
                            "u_address_line1": "1 Demo Street",
                            "u_address_line2": "Flat 2",
                            "u_city": "London",
                            "u_postcode": "E1 6AA",
                            "u_state": "England",
                            "u_country": "United Kingdom",
                            "u_health_condition": {"value": "preventative", "display_value": "Preventative care"},
                            "u_accessibility": "true",
                            "u_insurance_id": "INS-1",
                            "u_insurance_provider": "NHS",
                            "u_emergency_name": "Emergency Contact",
                            "u_emergency_phone": "07700000000",
                            "u_emergency_relationship": "Partner",
                            "u_username": "aisha.evans77",
                            "u_registration_status": "approved",
                            "u_account_status": "active",
                            "u_email_verified": "true",
                            "u_profile_complete": "true",
                            "u_confidence_score": "100",
                            "u_consent_accepted": "true",
                            "u_privacy_notice_version": "v1",
                            "u_time_preference": "Morning",
                            "u_blood_type": "A+",
                            "u_known_allergies": "None",
                        }
                    ]
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_profile(
                FakeSettings(),
                email="aisha.evans77@example.com",
                username="aisha.evans77",
                name="Aisha Evans",
                http_client=http_client,
            )

        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].url.params["sysparm_query"], "u_email=aisha.evans77@example.com")
        requested_fields = requests[0].url.params["sysparm_fields"]
        for field in (
            "sys_updated_on",
            "u_confidence_score",
            "u_consent_accepted",
            "u_privacy_notice_version",
            "u_time_preference",
        ):
            self.assertIn(field, requested_fields)
        self.assertEqual(response.patient_id, "NGH-200")
        self.assertEqual(response.first_name, "Aisha")
        self.assertEqual(response.gender, "Female")
        self.assertEqual(response.health_condition, "Preventative care")
        self.assertTrue(response.email_verified)
        self.assertTrue(response.profile_complete)
        self.assertEqual(response.state_region, "England, United Kingdom")
        self.assertEqual(response.confidence_score, "100")
        self.assertTrue(response.consent_accepted)
        self.assertEqual(response.privacy_notice_version, "v1")
        self.assertEqual(response.time_preference, "Morning")
        self.assertEqual(response.last_updated, "2026-06-04 18:08:29")

    async def test_falls_back_to_username_then_name(self):
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if len(requests) < 3:
                return httpx.Response(200, json={"result": []})
            return httpx.Response(
                200,
                json={
                    "result": [
                        {
                            "sys_id": "patient-sys-id",
                            "u_first_name": "Maya",
                            "u_last_name": "Patel",
                            "u_email": "maya@example.com",
                            "u_username": "maya.patel",
                        }
                    ]
                },
            )

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_profile(
                FakeSettings(),
                email="missing@example.com",
                username="missing-user",
                name="Maya Patel",
                http_client=http_client,
            )

        self.assertIsNotNone(response)
        self.assertEqual(len(requests), 3)
        self.assertEqual(requests[0].url.params["sysparm_query"], "u_email=missing@example.com")
        self.assertEqual(requests[1].url.params["sysparm_query"], "u_username=missing-user")
        self.assertEqual(requests[2].url.params["sysparm_query"], "u_first_name=Maya^u_last_name=Patel")

    async def test_returns_none_when_no_match(self):
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json={"result": []})

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_profile(
                FakeSettings(),
                email="missing@example.com",
                http_client=http_client,
            )

        self.assertIsNone(response)


class PatientBookingAvailabilityServiceNowTest(unittest.IsolatedAsyncioTestCase):
    async def test_uses_doctor_and_appointment_tables_only(self):
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.url.path.endswith("/u_doctor"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "doctor-sys-id",
                                "u_doctor_id": "DOC-100",
                                "u_first_name": "Sarah",
                                "u_last_name": "Patel",
                                "u_department": "General Practice",
                                "u_speciality": "Family Medicine",
                                "u_email": "sarah@example.com",
                                "u_active": "true",
                            }
                        ]
                    },
                )
            if request.url.path.endswith("/u_appointment"):
                return httpx.Response(200, json={"result": []})
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_booking_availability(
                FakeSettings(),
                start_date=date(2026, 6, 9),
                days=1,
                http_client=http_client,
            )

        self.assertEqual(
            [request.url.path for request in requests],
            ["/api/now/table/u_doctor", "/api/now/table/u_appointment"],
        )
        self.assertEqual(response.doctors[0].name, "Sarah Patel")
        self.assertEqual(response.doctors[0].doctor_id, "DOC-100")
        self.assertEqual(response.appointments, [])

    async def test_appointment_overlay_by_doctor_date_and_time(self):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/u_doctor"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "doctor-sys-id",
                                "u_doctor_id": "DOC-100",
                                "u_first_name": "Sarah",
                                "u_last_name": "Patel",
                                "u_department": "General Practice",
                                "u_speciality": "Family Medicine",
                                "u_email": "sarah@example.com",
                                "u_active": "true",
                            }
                        ]
                    },
                )
            if request.url.path.endswith("/u_appointment"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "appointment-sys-id",
                                "u_appointment_id": "APT-100",
                                "u_doctor": {"value": "doctor-sys-id", "display_value": "doctor-sys-id"},
                                "u_patient": {"value": "patient-sys-id", "display_value": "Maya Chen"},
                                "u_appointment_date": "2026-06-09",
                                "u_appointment_time": {"value": "1970-01-01 13:00:00", "display_value": "13:00:00"},
                                "u_status": {"value": "booked", "display_value": "Booked"},
                                "u_reason_category": "Follow-up",
                                "u_reason_text": "Review",
                            }
                        ]
                    },
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_booking_availability(
                FakeSettings(),
                start_date=date(2026, 6, 9),
                days=1,
                http_client=http_client,
            )

        appointment = response.appointments[0]
        self.assertEqual(appointment.appointment_id, "APT-100")
        self.assertEqual(appointment.doctor_name, "Sarah Patel")
        self.assertEqual(appointment.doctor_record_id, "doctor-sys-id")
        self.assertEqual(appointment.date, "2026-06-09")
        self.assertEqual(appointment.start_time, "13:00:00")
        self.assertEqual(appointment.patient_display, "Maya Chen")
        self.assertEqual(response.days[0].appointments[0].appointment_id, "APT-100")

    async def test_booking_range_is_capped_at_history_window(self):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/u_doctor") or request.url.path.endswith("/u_appointment"):
                return httpx.Response(200, json={"result": []})
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await fetch_patient_booking_availability(
                FakeSettings(),
                start_date=date(2026, 6, 9),
                days=400,
                http_client=http_client,
            )

        self.assertEqual(response.start_date, "2026-06-09")
        self.assertEqual(response.end_date, "2027-01-05")
        self.assertEqual(len(response.days), 211)

    async def test_create_booking_creates_appointment_without_slot(self):
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            if request.method == "GET" and request.url.path.endswith("/u_patient"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "patient-sys-id",
                                "u_first_name": "Aisha",
                                "u_last_name": "Evans",
                                "u_email": "aisha.evans77@example.com",
                            }
                        ]
                    },
                )
            if request.method == "GET" and request.url.path.endswith("/u_doctor"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "doctor-sys-id",
                                "u_doctor_id": "DOC-100",
                                "u_first_name": "Sarah",
                                "u_last_name": "Patel",
                                "u_department": "General Practice",
                                "u_speciality": "Family Medicine",
                                "u_email": "sarah@example.com",
                                "u_active": "true",
                            }
                        ]
                    },
                )
            if request.method == "GET" and request.url.path.endswith("/u_appointment"):
                return httpx.Response(200, json={"result": []})
            if request.method == "POST" and request.url.path.endswith("/u_appointment"):
                payload = json.loads(request.content)
                return httpx.Response(
                    201,
                    json={
                        "result": {
                            "sys_id": "appointment-sys-id",
                            "u_appointment_id": payload["u_appointment_id"],
                            "u_doctor": {"value": payload["u_doctor"], "display_value": "doctor-sys-id"},
                            "u_patient": {"value": payload["u_patient"], "display_value": "Aisha Evans"},
                            "u_appointment_date": payload["u_appointment_date"],
                            "u_appointment_time": {
                                "value": f"1970-01-01 {payload['u_appointment_time']}",
                                "display_value": payload["u_appointment_time"],
                            },
                            "u_status": {"value": payload["u_status"], "display_value": "Confirmed"},
                            "u_reason_category": payload["u_reason_category"],
                            "u_reason_text": payload["u_reason_text"],
                        }
                    },
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            response = await create_patient_booking_appointment(
                FakeSettings(),
                BookingAppointmentRequest(**booking_data()),
                http_client=http_client,
            )

        post_request = next(request for request in requests if request.method == "POST")
        payload = json.loads(post_request.content)
        self.assertTrue(payload["u_appointment_id"].startswith("APT-"))
        self.assertEqual(payload["u_doctor"], "doctor-sys-id")
        self.assertNotIn("u_slot", payload)
        self.assertEqual(payload["u_patient"], "patient-sys-id")
        self.assertEqual(payload["u_appointment_date"], "2026-06-09")
        self.assertEqual(payload["u_appointment_time"], "09:00:00")
        self.assertEqual(payload["u_status"], "confirmed")
        self.assertEqual(payload["u_triage_priority"], "urgent")
        self.assertEqual(payload["u_reason_category"], "urgent")
        self.assertFalse(any(request.method == "PATCH" for request in requests))
        self.assertEqual(response.appointment_record_id, "appointment-sys-id")

    async def test_create_booking_rejects_missing_patient(self):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/u_patient"):
                return httpx.Response(200, json={"result": []})
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaises(BookingPatientNotFoundError):
                await create_patient_booking_appointment(
                    FakeSettings(),
                    BookingAppointmentRequest(**booking_data()),
                    http_client=http_client,
                )

    async def test_create_booking_rejects_inactive_doctor(self):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/u_patient"):
                return httpx.Response(200, json={"result": [{"sys_id": "patient-sys-id"}]})
            if request.url.path.endswith("/u_doctor"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "doctor-sys-id",
                                "u_doctor_id": "DOC-100",
                                "u_first_name": "Sarah",
                                "u_last_name": "Patel",
                                "u_active": "false",
                            }
                        ]
                    },
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaises(BookingConflictError):
                await create_patient_booking_appointment(
                    FakeSettings(),
                    BookingAppointmentRequest(**booking_data()),
                    http_client=http_client,
                )

    async def test_create_booking_rejects_existing_appointment_conflict(self):
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/u_patient"):
                return httpx.Response(200, json={"result": [{"sys_id": "patient-sys-id"}]})
            if request.url.path.endswith("/u_doctor"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "doctor-sys-id",
                                "u_doctor_id": "DOC-100",
                                "u_first_name": "Sarah",
                                "u_last_name": "Patel",
                                "u_active": "true",
                            }
                        ]
                    },
                )
            if request.url.path.endswith("/u_appointment"):
                return httpx.Response(
                    200,
                    json={
                        "result": [
                            {
                                "sys_id": "appointment-sys-id",
                                "u_appointment_id": "APT-100",
                                "u_doctor": {"value": "doctor-sys-id", "display_value": "doctor-sys-id"},
                                "u_patient": {"value": "patient-sys-id", "display_value": "Aisha Evans"},
                                "u_appointment_date": "2026-06-09",
                                "u_appointment_time": {"value": "1970-01-01 09:00:00", "display_value": "09:00:00"},
                                "u_status": {"value": "confirmed", "display_value": "Confirmed"},
                            }
                        ]
                    },
                )
            return httpx.Response(404)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as http_client:
            with self.assertRaises(BookingConflictError):
                await create_patient_booking_appointment(
                    FakeSettings(),
                    BookingAppointmentRequest(**booking_data()),
                    http_client=http_client,
                )


class PatientRegistrationEndpointTest(unittest.TestCase):
    def setUp(self):
        get_settings.cache_clear()
        self.app = create_app()
        self.client = TestClient(self.app)

    def tearDown(self):
        self.app.dependency_overrides.clear()

    def test_valid_request_returns_confirmation(self):
        expected = PatientRegistrationResponse(
            message="Patient registration created in ServiceNow.",
            sys_id="patient-sys-id",
            patient_id="patient-public-id",
            first_name="Aisha",
            last_name="Evans",
            email="aisha.evans77@example.com",
            registration_status="pending",
        )

        with patch("app.main.create_patient_registration", new=AsyncMock(return_value=expected)):
            response = self.client.post("/api/patients/register", json=registration_data())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sys_id"], "patient-sys-id")
        self.assertEqual(response.json()["patient_id"], "patient-public-id")

    def test_missing_required_field_returns_422(self):
        data = registration_data()
        data["first_name"] = ""

        response = self.client.post("/api/patients/register", json=data)

        self.assertEqual(response.status_code, 422)

    def test_upstream_failure_returns_502(self):
        with patch(
            "app.main.create_patient_registration",
            new=AsyncMock(side_effect=ServiceNowError("ServiceNow 403: Forbidden")),
        ):
            response = self.client.post("/api/patients/register", json=registration_data())

        self.assertEqual(response.status_code, 502)
        self.assertIn("ServiceNow 403", response.json()["detail"])

    def test_booking_availability_endpoint_returns_normalized_response(self):
        expected = BookingAvailabilityResponse(
            start_date="2026-06-09",
            end_date="2026-06-09",
            days=[{"date": "2026-06-09", "label": "Jun 9", "appointments": []}],
            doctors=[],
            appointments=[],
        )

        with patch("app.main.fetch_patient_booking_availability", new=AsyncMock(return_value=expected)):
            response = self.client.get("/api/patients/booking/availability?start_date=2026-06-09&days=1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["start_date"], "2026-06-09")

    def test_booking_create_endpoint_returns_created_appointment(self):
        expected = BookingAppointment(
            appointment_id="APT-123",
            appointment_record_id="appointment-sys-id",
            doctor_id="DOC-100",
            doctor_record_id="doctor-sys-id",
            doctor_name="Sarah Patel",
            date="2026-06-09",
            start_time="09:00:00",
            status="confirmed",
            status_label="Confirmed",
        )

        with patch("app.main.create_patient_booking_appointment", new=AsyncMock(return_value=expected)):
            response = self.client.post("/api/patients/booking/appointments", json=booking_data())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["appointment_record_id"], "appointment-sys-id")

    def test_booking_create_endpoint_returns_409_for_stale_time(self):
        with patch(
            "app.main.create_patient_booking_appointment",
            new=AsyncMock(side_effect=BookingConflictError("Selected appointment time is no longer available.")),
        ):
            response = self.client.post("/api/patients/booking/appointments", json=booking_data())

        self.assertEqual(response.status_code, 409)
        self.assertIn("no longer available", response.json()["detail"])

    def test_booking_create_endpoint_returns_404_for_missing_patient(self):
        with patch(
            "app.main.create_patient_booking_appointment",
            new=AsyncMock(side_effect=BookingPatientNotFoundError("Patient profile not found.")),
        ):
            response = self.client.post("/api/patients/booking/appointments", json=booking_data())

        self.assertEqual(response.status_code, 404)

    def test_patient_profile_endpoint_returns_profile(self):
        expected = PatientProfileResponse(
            sys_id="patient-sys-id",
            patient_id="NGH-200",
            first_name="Aisha",
            last_name="Evans",
            email="aisha.evans77@example.com",
            profile_complete=True,
            email_verified=True,
            confidence_score="100",
            consent_accepted=True,
            privacy_notice_version="v1",
            time_preference="Morning",
            last_updated="2026-06-04 18:08:29",
        )

        with patch("app.main.fetch_patient_profile", new=AsyncMock(return_value=expected)):
            response = self.client.get(
                "/api/patients/profile?email=aisha.evans77%40example.com&username=aisha.evans77&name=Aisha%20Evans"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["patient_id"], "NGH-200")
        self.assertTrue(response.json()["profile_complete"])
        self.assertEqual(response.json()["confidence_score"], "100")
        self.assertTrue(response.json()["consent_accepted"])
        self.assertEqual(response.json()["privacy_notice_version"], "v1")
        self.assertEqual(response.json()["time_preference"], "Morning")
        self.assertEqual(response.json()["last_updated"], "2026-06-04 18:08:29")

    def test_patient_profile_endpoint_returns_404_when_no_match(self):
        with patch("app.main.fetch_patient_profile", new=AsyncMock(return_value=None)):
            response = self.client.get("/api/patients/profile?email=missing%40example.com")

        self.assertEqual(response.status_code, 404)

    def test_patient_profile_endpoint_upstream_failure_returns_502(self):
        with patch(
            "app.main.fetch_patient_profile",
            new=AsyncMock(side_effect=ServiceNowError("ServiceNow 403: Forbidden")),
        ):
            response = self.client.get("/api/patients/profile?email=aisha.evans77%40example.com")

        self.assertEqual(response.status_code, 502)
        self.assertIn("ServiceNow 403", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()

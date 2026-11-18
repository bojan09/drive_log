# Backup file format

Export produces one UTF-8 JSON file. Import accepts the same structure.

```json
{
  "app": "driver-activity-tracker",
  "schemaVersion": 1,
  "exportedAt": "2026-11-17T09:30:00.000Z",
  "drivers": [
    {
      "id": "3f2c0a52-8d0e-4c5c-9d7e-0c5b4f1a2b11",
      "name": "Ana Lee",
      "vehicle": "Van 1",
      "registration": "AB-101",
      "status": "Active",
      "createdAt": "2026-01-05"
    }
  ],
  "records": [
    {
      "id": "b7a1d9f4-6c3e-4a58-8f20-1d9e3c7a5e02",
      "driverId": "3f2c0a52-8d0e-4c5c-9d7e-0c5b4f1a2b11",
      "date": "2026-11-17",
      "createdAt": "2026-11-17"
    }
  ]
}
```

## Fields

**Driver**

| Field | Rules |
| --- | --- |
| `id` | Text, 1–100 characters, unique among drivers. The app generates UUIDs. |
| `name` | Text, 1–80 characters after trimming. |
| `vehicle` | Text, 1–60 characters. One vehicle per driver. |
| `registration` | Optional text, up to 30 characters. Empty string if none. |
| `status` | `"Active"` or `"Inactive"`. |
| `createdAt` | Date added, `YYYY-MM-DD`. |

**Record**

| Field | Rules |
| --- | --- |
| `id` | Text, 1–100 characters, unique among records. |
| `driverId` | Must match the `id` of a driver in the same file. |
| `date` | A real calendar date, `YYYY-MM-DD` (for example `2026-02-30` is rejected). |
| `createdAt` | `YYYY-MM-DD`. |

Records contain only the driver and the date.

## How import treats a file

- The top level must contain `drivers` and `records` arrays. A `schemaVersion` greater than 1 is refused.
- Import **replaces** all current data. Nothing is merged.
- Each item is checked on its own. Invalid items, duplicate IDs, records for unknown drivers, and **a second record for the same driver and date** are skipped and counted in the confirmation message and the final notice. Unknown extra fields are dropped.
- Vehicle and registration uniqueness are not enforced during import, so older or hand-edited files still load. The app enforces them again when you next save a driver.
- `exportedAt` and `app` are informational.

## Editing a backup by hand

Keep dates in `YYYY-MM-DD`, make sure every `driverId` exists, and use unique IDs. Any short unique text works as an ID. Run a hand-edited file through Import: the confirmation shows how many items would be skipped.

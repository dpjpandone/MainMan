### 📎 Reference: Supabase Database Schema Snapshot

> This is a snapshot of our live Supabase schema. Use this to identify any file that interacts with image captions, file labels, or image URLs — whether directly or indirectly. Focus especially on `procedures.captions`, `image_urls`, and related JSON fields.

| table_name             | column_name    | data_type                   |
| ---------------------- | -------------- | --------------------------- |
| companies              | id             | uuid                        |
| companies              | company_name   | text                        |
| companies              | created_at     | timestamp with time zone    |
| debug_logs             | id             | uuid                        |
| debug_logs             | created_at     | timestamp with time zone    |
| debug_logs             | log_text       | text                        |
| debug_logs             | tag            | text                        |
| debug_logs             | device_id      | text                        |
| machines               | id             | uuid                        |
| machines               | name           | text                        |
| machines               | company_id     | uuid                        |
| machines               | created_at     | timestamp with time zone    |
| machines               | shop           | text                        |
| non_routine_procedures | id             | uuid                        |
| non_routine_procedures | company_id     | uuid                        |
| non_routine_procedures | machine_name   | text                        |
| non_routine_procedures | procedure_name | text                        |
| non_routine_procedures | description    | text                        |
| non_routine_procedures | due_date       | date                        |
| non_routine_procedures | created_at     | timestamp with time zone    |
| procedures             | id             | uuid                        |
| procedures             | machine_id     | uuid                        |
| procedures             | procedure_name | text                        |
| procedures             | description    | text                        |
| procedures             | interval_days  | integer                     |
| procedures             | last_completed | timestamp without time zone |
| procedures             | created_at     | timestamp with time zone    |
| procedures             | image_urls     | jsonb                       |
| procedures             | due_date       | timestamp without time zone |
| procedures             | company_id     | uuid                        |
| procedures             | file_urls      | ARRAY                       |
| procedures             | file_labels    | jsonb                       |
| procedures             | completed_by   | uuid                        |
| procedures             | captions       | jsonb                       |
| profiles               | id             | uuid                        |
| profiles               | initials       | character varying           |
| profiles               | created_at     | timestamp with time zone    |
| shops                  | id             | uuid                        |
| shops                  | company_id     | uuid                        |
| shops                  | name           | text                        |
| shops                  | inserted_at    | timestamp with time zone    |
| test_sync              | id             | integer                     |
| test_sync              | counter        | integer                     |

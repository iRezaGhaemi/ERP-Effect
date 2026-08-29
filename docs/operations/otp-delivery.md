# OTP delivery operations

Set `OTP_DELIVERY_ACTIVATION_MARGIN_SECONDS` to the scheduling and database-activation allowance that must remain after the SMS provider's five-second HTTP timeout. The value is validated as an integer from 1 through 30 seconds; production should size it from observed worker and database latency. A delivery starts only when challenge validity is strictly greater than the provider timeout plus this margin.

The durable outbox provides at-least-once delivery. It sends the immutable delivery-job ID as `requestId`, so duplicate-SMS suppression depends on the configured SMS gateway treating that value as an idempotency key across retries. Production gateways must honor that contract; the current provider protocol does not independently guarantee deduplication.

Terminal OTP rows are retained for 24 hours, then the worker removes them in batches of at most 500 at a one-minute cadence. Cleanup errors are logged without provider, OTP, or database details and do not stop delivery or audit processing.

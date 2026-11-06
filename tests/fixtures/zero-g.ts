export const TRANSCRIPTION_HEADER_REQUEST_ID = "synthetic-transcription-header-id";
export const TRANSCRIPTION_TRACE_REQUEST_ID = "  synthetic-transcription-trace-id  ";
export const PLANNING_TRACE_REQUEST_ID = "  synthetic-planning-trace-id  ";

export const transcriptionWithHeaderEvidence = {
  headers: new Headers({ "x-request-id": TRANSCRIPTION_HEADER_REQUEST_ID }),
  body: { text: "synthetic transcript" },
};

export const transcriptionWithTraceEvidence = {
  headers: new Headers(),
  body: {
    text: "synthetic transcript",
    x_0g_trace: { request_id: TRANSCRIPTION_TRACE_REQUEST_ID },
  },
};

export const planningWithTraceEvidence = {
  headers: new Headers(),
  body: {
    x_0g_trace: { request_id: PLANNING_TRACE_REQUEST_ID },
  },
};

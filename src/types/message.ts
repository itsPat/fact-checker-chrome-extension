export interface SuccessMessage {
  type: "FACT_CHECK_SUCCESS";
  answer: string;
  citations: string[];
  selectedText: string;
}

export interface LoadingMessage {
  type: "FACT_CHECK_LOADING";
}

export interface ErrorMessage {
  type: "FACT_CHECK_ERROR";
  error: string;
}

export type Message = SuccessMessage | ErrorMessage | LoadingMessage;

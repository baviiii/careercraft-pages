export type StreamEvent =
  | {
      type: "message-start";
      messageId: string;
    }
  | {
      type: "token";
      messageId: string;
      token: string;
    }
  | {
      type: "source";
      messageId: string;
      source: string;
    }
  | {
      type: "method";
      messageId: string;
      method: string;
    }
  | {
      type: "message-end";
      messageId: string;
    }
  | {
      type: "error";
      messageId: string;
      error: string;
    };
import { getLineAdminStubMessage, getLineNotReadyMessage, getLinePlayerStubMessage } from "@/lib/platforms/line/messages";
import { parseLineTextAction } from "@/lib/platforms/line/ui";

export type LineFlowContext = {
  text: string;
  isAdmin: boolean;
};

export function handleLineFlow(context: LineFlowContext) {
  const action = parseLineTextAction(context.text);

  if (context.isAdmin) {
    return {
      action,
      message: `${getLineAdminStubMessage()}\n\n目前收到的 action：${action.action}`
    };
  }

  if (action.action === "unknown") {
    return {
      action,
      message: `${getLineNotReadyMessage()}\n\n${getLinePlayerStubMessage()}`
    };
  }

  return {
    action,
    message: `${getLinePlayerStubMessage()}\n\n目前收到的 action：${action.action}`
  };
}

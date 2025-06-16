import * as React from "react";

import CopyToClipboard from "react-copy-to-clipboard";
import { IconCheckInCircle } from "../../../icons/Icons";
import { __ } from "../../../utils";

type Props = {
  ticketNumber: string;
  isForget?: boolean;
};

const SuccessForm: React.FC<Props> = ({ ticketNumber, isForget }) => {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    console.log("[디버그] SuccessForm 렌더링, ticketNumber:", ticketNumber);
  }, [ticketNumber]);

  const onCopy = (number: string) => {
    if (number) {
      return setCopied(true);
    }
  };

  return (
    <div className="success-wrapper">
      <div className="message">
        <IconCheckInCircle />
        {!isForget && <h3>{__("Your ticket has been submitted")}</h3>}
        {ticketNumber && (
          <p>
            {__("Your ticket number is:")}
            <b>{ticketNumber}</b>
          </p>
        )}
      </div>
    </div>
  );
};

export default SuccessForm;

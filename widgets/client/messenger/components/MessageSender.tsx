import * as React from "react";

import { IconSend, iconAttach } from "../../icons/Icons";
import { useCallback, useEffect, useRef, useState } from "react";

import EmojiPicker from "./EmojiPicker";
import { MESSAGE_TYPES } from "../constants";
import PersistentMenu from "./PersistentMenu";
import { __ } from "../../utils";
import { getMessengerData } from "../utils/util";

type Props = {
  placeholder?: string;
  conversationId: string | null;
  inputDisabled: boolean;
  isAttachingFile: boolean;
  isParentFocused: boolean;
  sendMessage: (contentType: string, message: string) => void;
  sendTypingInfo: (conversationId: string, text: string) => void;
  sendFiles: (files: FileList) => void;
  readMessages: (conversationId: string) => void;
  onTextInputBlur: () => void;
  collapseHead: () => void;
  showVideoCallRequest: boolean;
};

let inputTimeoutInstance: any;

const MessageSender: React.FC<Props> = (props) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    conversationId,
    inputDisabled,
    isParentFocused,
    sendTypingInfo,
    sendFiles,
    readMessages,
    onTextInputBlur,
    collapseHead,
    isAttachingFile,
    placeholder,
  } = props;

  const clearTimeoutInstance = () => {
    if (inputTimeoutInstance) {
      clearTimeout(inputTimeoutInstance);
    }
  };

  useEffect(() => {
    if (textareaRef.current && window.innerWidth > 415) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isParentFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isParentFocused]);

  useEffect(() => {
    return () => clearTimeoutInstance();
  }, []);

  const setHeight = (height?: number | "auto") => {
    const textarea = textareaRef.current;
    const form = formRef.current;

    if (!textarea || !form) {
      return;
    }

    // Reset textarea height to calculate scrollHeight correctly
    textarea.style.height = "0";

    let formHeight;
    let textareaHeight;

    if (height === "auto") {
      formHeight = "auto";
      textareaHeight = "auto";
    } else if (typeof height === "number") {
      const heightInPx = `${height}px`;
      formHeight = heightInPx;
      textareaHeight = heightInPx;
    } else {
      // Use scrollHeight to adjust to content size
      const { scrollHeight } = textarea;
      formHeight = `${scrollHeight}px`;
      textareaHeight = `${scrollHeight - 1}px`;
    }

    form.style.height = formHeight;
    textarea.style.height = textareaHeight;
  };

  const sendMessage = () => {
    props.sendMessage(MESSAGE_TYPES.TEXT, message);
    setMessage("");
    setHeight("auto");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if ((conversationId || "").length === 0 && inputDisabled) {
      return;
    }

    sendMessage();
  };

  // clearTimeout() {
  //   if (inputTimeoutInstance) {
  //     clearTimeout(inputTimeoutInstance);
  //   }
  // }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const message = e.currentTarget.value;
      setMessage(message);

      if (conversationId) {
        clearTimeoutInstance();
        inputTimeoutInstance = setTimeout(() => {
          sendTypingInfo(conversationId, message);
        }, 800);
      }

      setHeight();
    },
    [conversationId, sendTypingInfo]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        props.sendMessage(MESSAGE_TYPES.TEXT, message);
        setMessage("");
        setHeight("auto");
      }
    },
    [message, sendMessage]
  );

  const handleBlur = useCallback(() => {
    if (conversationId) {
      sendTypingInfo(conversationId, "");
    }
    onTextInputBlur();
  }, [conversationId, onTextInputBlur, sendTypingInfo]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const { files } = e.currentTarget;
      if (files && files.length > 0) {
        sendFiles(files);
      }
    },
    [sendFiles]
  );
  const handleReadMessages = () => {
    if (conversationId) {
      readMessages(conversationId);
    }
  };
  const handleClick = useCallback(() => {
    collapseHead();
  }, [collapseHead]);

  const sendVideoCallRequest = useCallback(() => {
    props.sendMessage(MESSAGE_TYPES.VIDEO_CALL_REQUEST, "");
  }, [sendMessage]);

  const renderFileUploader = () => {
    return (
      <label title="File upload" htmlFor="file-upload">
        {iconAttach}
        <input
          id="file-upload"
          disabled={!conversationId || inputDisabled}
          type="file"
          onChange={handleFileInput}
        />
      </label>
    );
  };

  const renderSendButton = () => {
    if (!message.length) {
      return null;
    }

    return (
      <button type="submit" form="message-sending-form">
        <IconSend />
      </button>
    );
  };

  return (
    <form
      className="erxes-message-sender"
      ref={formRef}
      onSubmit={handleSubmit}
      id="message-sending-form"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder={placeholder}
        value={message}
        onChange={handleChange}
        onFocus={handleReadMessages}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyPress}
        disabled={(conversationId || "").length > 0 ? false : inputDisabled}
      />
      <div className="messenger-action-buttons">
        <EmojiPicker
          onEmojiSelect={(emoji: any) => {
            setMessage((prevMessage) => prevMessage + emoji.native);
            setHeight();
          }}
        />
        {renderFileUploader()}
        <PersistentMenu messengerData={getMessengerData()} />
        {renderSendButton()}
      </div>
    </form>
  );
};

export default MessageSender;

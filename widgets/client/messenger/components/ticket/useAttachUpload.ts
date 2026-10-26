import * as React from 'react';

import uploadHandler from '../../../uploadHandler';
import { connection } from '../../connection';

export interface FileWithUrl extends File {
  url?: string;
}

// 작은 📎 버튼으로 파일을 골라 바로 올리고, 올라간 파일 목록을 부모(files/handleFiles)에 넘긴다.
// 티켓 진행 상황 입력창과 티켓 제출 화면이 함께 쓴다.
export const useAttachUpload = (
  files: FileWithUrl[],
  handleFiles?: (files: FileWithUrl[]) => void,
) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const filesRef = React.useRef<FileWithUrl[]>(files);
  const [uploading, setUploading] = React.useState(0);

  filesRef.current = files;

  const allowedTypes: string[] =
    connection.data?.messengerData?.allowedFileTypes || [];
  const accept = allowedTypes.length ? allowedTypes.join(',') : undefined;

  const openPicker = () => inputRef.current?.click();

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;

    if (!picked || picked.length === 0 || !handleFiles) {
      return;
    }

    setUploading((count) => count + picked.length);

    uploadHandler({
      files: picked,
      beforeUpload: () => undefined,
      afterUpload({ response, fileInfo }: { response: any; fileInfo: any }) {
        setUploading((count) => Math.max(0, count - 1));
        // 같은 이름 파일은 새로 올린 것으로 바꾼다
        const next = [
          ...filesRef.current.filter((file) => file.name !== fileInfo.name),
          { ...fileInfo, url: response } as FileWithUrl,
        ];
        filesRef.current = next;
        handleFiles(next);
      },
      onError: (message: string) => {
        setUploading((count) => Math.max(0, count - 1));
        alert(message);
      },
    });

    e.target.value = '';
  };

  const removeFile = (name: string) => {
    if (handleFiles) {
      handleFiles(files.filter((file) => file.name !== name));
    }
  };

  return { inputRef, accept, uploading, openPicker, onPick, removeFile };
};

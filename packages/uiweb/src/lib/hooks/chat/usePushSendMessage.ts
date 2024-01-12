import * as PushAPI from '@pushprotocol/restapi';
import { useCallback, useContext, useState } from 'react';
import useVerifyAccessControl from './useVerifyAccessControl';
import { useChatData } from '..';
import { ENV } from '../../config';
import { setAccessControl } from '../../helpers';

interface SendMessageParams {
  message: string;
  chatId: string;
  messageType?: 'Text' | 'Image' | 'File' | 'GIF' | 'MediaEmbed';
}

const usePushSendMessage = () => {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState<boolean>(false);

  const { env, account, pushUser } = useChatData();

  const sendMessage = useCallback(
    async (options: SendMessageParams) => {
      const { chatId, message, messageType } = options || {};
      setLoading(true);
      try {
        const response = await pushUser?.chat.send(chatId, {
          type: messageType,
          content: message,
        })
        setLoading(false);
        if (!response) {
          return false;
        }
        return response;
      } catch (error: Error | any) {
        setLoading(false);
        setError(error.message);
        console.error(error);
        return error.message;
      }
    },
    [ account, env, pushUser]
  );

  return { sendMessage, error, loading };
};

export default usePushSendMessage;

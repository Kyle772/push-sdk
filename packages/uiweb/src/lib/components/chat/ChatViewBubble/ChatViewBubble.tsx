import {
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import moment from 'moment';
import styled from 'styled-components';
import { TwitterTweetEmbed } from 'react-twitter-embed';

import { Section, Span, Image } from '../../reusables';
import useToast from '../reusables/NewToast';
import { checkTwitterUrl } from '../helpers/twitter';
import { ChatDataContext } from '../../../context';
import { useAccount, useChatData } from '../../../hooks';
import { ThemeContext } from '../theme/ThemeProvider';

import {
  FileMessageContent,
  FrameButton,
  FrameDetails,
  IFrame,
} from '../../../types';
import { IMessagePayload, TwitterFeedReturnType } from '../exportedTypes';
import { allowedNetworks, ENV, FILE_ICON } from '../../../config';
import {
  formatFileSize,
  getPfp,
  pCAIP10ToWallet,
  shortenText,
  sign,
  toSerialisedHexString,
} from '../../../helpers';
import {
  extractWebLink,
  getFormattedMetadata,
  hasWebLink,
} from '../../../utilities';
import { Button, TextInput } from '../reusables';
import { MdError, MdOpenInNew } from 'react-icons/md';
import { FaBell, FaLink, FaRegThumbsUp } from 'react-icons/fa';
import { BsLightning } from 'react-icons/bs';
import {
  ChatMainStateContext,
  ChatMainStateContextType,
} from '../../../context/chatAndNotification/chat/chatMainStateContext';

const SenderMessageAddress = ({ chat }: { chat: IMessagePayload }) => {
  const { account } = useContext(ChatDataContext);
  const theme = useContext(ThemeContext);
  return (
    <>
      {chat.fromCAIP10.split(':')[1] !== account && (
        <Span
          theme={theme}
          alignSelf="start"
          textAlign="start"
          fontSize={theme.fontSize?.chatReceivedBubbleAddressText}
          fontWeight={theme.fontWeight?.chatReceivedBubbleAddressText}
          color={theme.textColor?.chatReceivedBubbleAddressText}
        >
          {chat.fromDID.split(':')[1].slice(0, 6)}...
          {chat.fromDID.split(':')[1].slice(-6)}
        </Span>
      )}
    </>
  );
};

const SenderMessageProfilePicture = ({ chat }: { chat: IMessagePayload }) => {
  const { account, env } = useContext(ChatDataContext);
  const [pfp, setPfp] = useState<string>('');
  const getUserPfp = async () => {
    const pfp = await getPfp({
      account: chat.fromCAIP10.split(':')[1],
      env: env,
    });
    if (pfp) {
      setPfp(pfp);
    }
  };
  useEffect(() => {
    getUserPfp();
  }, [account, chat.fromCAIP10]);
  return (
    <Section justifyContent="start" alignItems="start">
      {chat.fromCAIP10.split(':')[1] !== account && (
        <Section alignItems="start">
          {pfp && (
            <Image
              src={pfp}
              alt="profile picture"
              width="40px"
              height="40px"
              borderRadius="50%"
            />
          )}
        </Section>
      )}
    </Section>
  );
};

const MessageWrapper = ({
  chat,
  children,
  isGroup,
  maxWidth,
}: {
  chat: IMessagePayload;
  children: ReactNode;
  isGroup: boolean;
  maxWidth?: string;
}) => {
  const theme = useContext(ThemeContext);
  return (
    <Section
      theme={theme}
      flexDirection="row"
      justifyContent="start"
      gap="6px"
      width="fit-content"
      maxWidth={maxWidth || 'auto'}
    >
      {isGroup && <SenderMessageProfilePicture chat={chat} />}
      <Section justifyContent="start" flexDirection="column">
        {isGroup && <SenderMessageAddress chat={chat} />}
        {children}
      </Section>
    </Section>
  );
};
const FrameRenderer = ({
  url,
  account,
  messageId,
}: {
  url: string;
  account: string;
  messageId: string;
}) => {
  const { env, user, pgpPrivateKey } = useChatData();
  const { chainId, switchChain, provider } = useAccount({ env });
  const { selectedChatId } =
    useContext<ChatMainStateContextType>(ChatMainStateContext);
  const frameRenderer = useToast();
  const proxyServer = 'http://localhost:5004/';
  const [FrameData, setFrameData] = useState<IFrame>({} as IFrame);
  const [inputText, setInputText] = useState<string>('');
  const [imageLoadingError, setImageLoadingError] = useState<boolean>(false);
  // Fetches the metadata for the URL to fetch the Frame

  useEffect(() => {
    const fetchMetaTags = async (url: string) => {
      try {
        const response = await fetch(`${proxyServer}/${url}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Origin: window.location.origin,
          },
        });

        const htmlText = await response.text();

        const frameDetails: IFrame = getFormattedMetadata(url, htmlText);

        console.log('Frame Details:', FrameData);
        setFrameData(frameDetails);
      } catch (err) {
        console.error('Error fetching meta tags for rendering frame:', err);
      }
    };

    if (url) {
      fetchMetaTags(url);
    }
  }, [url]);
  const getButtonIconContent = (button: FrameButton) => {
    switch (button.action) {
      case 'link':
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              width: '90%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <FaLink /> {button.content}
          </span>
        );

      case 'post_redirect':
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              width: '90%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <MdOpenInNew /> {button.content}
          </span>
        );
      case 'tx':
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              width: '90%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <BsLightning /> {button.content}
          </span>
        );

      case button?.action?.includes('subscribe') && 'subscribe':
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              width: '90%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <FaBell /> {button.content}
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              width: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {button.content}
          </span>
        );
    }
  };
  // Function to subscribe to a channel
  const subscribeToChannel = async (channel: string, desiredChain: any) => {
    if (!user) return { status: 'failure', message: 'User not initialised' };

    if (chainId !== Number(desiredChain)) {
      if (allowedNetworks[env].some((chain) => chain === Number(desiredChain)))
        switchChain(Number(desiredChain));
      else {
        frameRenderer.showMessageToast({
          toastTitle: 'Error',
          toastMessage: 'Chain not supported',
          toastType: 'ERROR',
          getToastIcon: (size: any) => <MdError size={size} color="red" />,
        });
        return { status: 'failure', message: 'Chain not supported' };
      }
    }
    try {
      const response = await user.notification.subscribe(
        `eip155:${desiredChain}:${channel}`
      );
      if (response.status === 204)
        frameRenderer.showMessageToast({
          toastTitle: 'Success',
          toastMessage: 'Subscribed Successfully',
          toastType: 'SUCCESS',
          getToastIcon: (size: any) => (
            <FaRegThumbsUp size={size} color="green" />
          ),
        });
      return { status: 'success', message: 'Subscribed' };
    } catch (error) {
      frameRenderer.showMessageToast({
        toastTitle: 'Error',
        toastMessage: 'Chain not supported',
        toastType: 'ERROR',
        getToastIcon: (size: any) => <MdError size={size} color="red" />,
      });
      return { status: 'failure', message: 'Something went wrong' };
    }
    return { status: 'failure', message: 'Unexpected error' };
  };

  // Function to trigger a transaction
  const TriggerTx = async (data: any, provider: any) => {
    if (chainId !== Number(data.chainId.slice(7))) {
      if (
        allowedNetworks[env].some(
          (chain) => chain === Number(data.chainId.slice(7))
        )
      )
        switchChain(Number(data.chainId.slice(7)));
      else {
        frameRenderer.showMessageToast({
          toastTitle: 'Error',
          toastMessage: 'Chain not supported',
          toastType: 'ERROR',
          getToastIcon: (size: any) => <MdError size={size} color="red" />,
        });
        return { status: 'failure', message: 'Chain not supported' };
      }
    }
    let hash = undefined;
    try {
      const signer = provider.getUncheckedSigner();
      const tx = await signer.sendTransaction({
        from: account,
        to: data.params.to,
        value: data.params.value,
        data: data.params.data,
        chainId: Number(data.chainId.slice(7)),
      });
      hash = tx.hash;
      return { hash, status: 'success', message: 'Transaction sent' };
    } catch (error) {
      frameRenderer.showMessageToast({
        toastTitle: 'Error',
        toastMessage: 'Something went wrong',
        toastType: 'ERROR',
        getToastIcon: (size: any) => <MdError size={size} color="red" />,
      });
      return {
        hash: 'Failed',
        status: 'failure',
        message: 'Something went wrong',
      };
    }
  };

  // Function to handle button click on a frame button
  const onButtonClick = async (button: FrameButton) => {
    if (!FrameData.isValidFrame) return;
    if (button.action === 'mint') {
      frameRenderer.showMessageToast({
        toastTitle: 'Error',
        toastMessage: 'Mint Action is not supported',
        toastType: 'ERROR',
        getToastIcon: (size: any) => <MdError size={size} color="red" />,
      });
      return;
    }
    let hash;

    const serializedProtoMessage = await toSerialisedHexString({
      url: url,
      unixTimestamp: Date.now().toString(),
      buttonIndex: Number(button.index),
      inputText: FrameData.frameDetails?.inputText ? inputText : 'undefined',
      state: FrameData.frameDetails?.state ?? 'undefined',
      transactionId: hash ?? '',
      address: account,
      messageId: messageId,
      chatId: window.location.href.split('/').pop() ?? 'null',
      clientProtocol: 'push',
      env: env,
    });
    const signedMessage = await sign({
      message: serializedProtoMessage,
      signingKey: pgpPrivateKey!,
    });

    // If the button action is post_redirect or link, opens the link in a new tab
    if (button.action === 'post_redirect' || button.action === 'link') {
      window.open(button.target!, '_blank');
      return;
    }

    // If the button action is subscribe, subscribes to the channel and then makes a POST call to the Frame server
    if (button.action?.includes('subscribe')) {
      const desiredChainId = button.action?.split(':')[1];

      const response = await subscribeToChannel(button.target!, desiredChainId);
      if (response.status === 'failure') {
        return;
      }
    }

    // If the button action is tx, triggers a transaction and then makes a POST call to the Frame server
    if (button.action === 'tx' && button.target) {
      const response = await fetch(`${proxyServer}/${button.target}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          clientProtocol: 'push',
          untrustedData: {
            url: url,
            unixTimestamp: Date.now().toString(),
            buttonIndex: Number(button.index),
            inputText: FrameData.frameDetails?.inputText
              ? inputText
              : 'undefined',
            state: FrameData.frameDetails?.state ?? 'undefined',
            transactionId: hash ?? '',
            address: account,
            messageId: messageId,
            chatId: window.location.href.split('/').pop() ?? 'null',
            clientProtocol: 'push',
            env: env,
          },
          trustedData: {
            messageBytes: serializedProtoMessage,
            pgpSignature: signedMessage,
          },
        }),
      });

      const data = await response.json();

      const { hash: txid, status } = await TriggerTx(data, provider);
      hash = txid;
      if (!txid || status === 'failure') return;
    }

    // Makes a POST call to the Frame server after the action has been performed

    let post_url = button.post_url ?? FrameData.frameDetails?.postURL ?? url;

    if (button.action === 'post') {
      post_url =
        button.target ??
        button.post_url ??
        FrameData.frameDetails?.postURL ??
        url;
    }
    if (!post_url) return;
    const response = await fetch(`${proxyServer}/${post_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: window.location.origin,
      },
      body: JSON.stringify({
        clientProtocol: 'push',
        untrustedData: {
          url: url,
          unixTimestamp: Date.now().toString(),
          buttonIndex: Number(button.index),
          inputText: FrameData.frameDetails?.inputText
            ? inputText
            : 'undefined',
          state: FrameData.frameDetails?.state ?? 'undefined',
          transactionId: hash ?? '',
          address: account,
          messageId: messageId,
          chatId: window.location.href.split('/').pop() ?? 'null',
          clientProtocol: 'push',
          env: env,
        },
        trustedData: {
          messageBytes: serializedProtoMessage,
          pgpSignature: signedMessage,
        },
      }),
    });

    const data = await response.text();

    const frameDetails: IFrame = getFormattedMetadata(url, data);
    setInputText('');

    setFrameData(frameDetails);
  };
  return (
    <div>
      {FrameData.isValidFrame && (
        <div
          style={{
            width: '32rem',

            display: 'flex',
            flexDirection: 'column',
            marginTop: '0.5rem',
            justifyContent: 'center',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#c0c4cb',
            borderRadius: '0.75rem',

            backgroundColor: '#fff',
          }}
        >
          <a href={url} target="blank">
            <img
              src={
                FrameData.frameDetails?.image ?? FrameData.frameDetails?.ogImage
              }
              alt="Frame Fallback"
              style={{
                borderRadius: '12px 12px 0px 0px',
                width: '100%',
              }}
              onError={() => {
                setImageLoadingError(true);
              }}
            />
            {imageLoadingError && (
              <div
                style={{
                  borderRadius: '12px 12px 0px 0px',
                  width: '100%',
                  height: '300px', // Set the height to match the image height
                  backgroundColor: '#f0f0f0', // Background color for the div
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#333', // Text color for the message
                }}
              >
                Image cannot be loaded
              </div>
            )}
          </a>
          {FrameData.frameDetails?.inputText && (
            <div style={{ width: '95%', margin: 'auto', color: 'black' }}>
              <TextInput
                onInputChange={(e: any) => {
                  setInputText(e.target.value);
                }}
                inputValue={inputText as string}
                placeholder={FrameData.frameDetails?.inputText}
              />
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '95%',
              margin: 'auto',
            }}
          >
            {FrameData.frameDetails &&
              FrameData.frameDetails.buttons.map((button) => (
                <div
                  style={{
                    width: '100%',
                  }}
                >
                  <Button
                    width="98%"
                    customStyle={{
                      maxHeight: '12px',
                      padding: '12px 6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      onButtonClick(button);
                    }}
                  >
                    {getButtonIconContent(button)}
                  </Button>
                </div>
              ))}
          </div>
          <div
            style={{
              display: 'flex',
              width: '96%',
              justifyContent: 'flex-end',

              marginTop: '10px',
              marginBottom: '10px',
            }}
          >
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'rgba(0, 0, 0, 0.6)', textDecoration: 'none' }}
            >
              {new URL(url).hostname}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
const MessageCard = ({
  chat,
  position,
  isGroup,
  account,
}: {
  chat: IMessagePayload;
  position: number;
  isGroup: boolean;
  account: string;
}) => {
  const theme = useContext(ThemeContext);
  const time = moment(chat.timestamp).format('hh:mm a');
  return (
    <MessageWrapper chat={chat} isGroup={isGroup} maxWidth="70%">
      <Section alignSelf={position ? 'end' : 'start'}>
        {hasWebLink(chat.messageContent) && (
          <FrameRenderer
            url={extractWebLink(chat.messageContent) ?? ''}
            account={account}
            messageId={chat.link ?? 'null'}
          />
        )}
      </Section>
      <Section
        gap="5px"
        background={
          position
            ? `${theme.backgroundColor?.chatSentBubbleBackground}`
            : `${theme.backgroundColor?.chatReceivedBubbleBackground}`
        }
        padding="8px 12px"
        borderRadius={position ? '12px 0px 12px 12px' : '0px 12px 12px 12px'}
        margin="5px 0"
        alignSelf={position ? 'end' : 'start'}
        justifyContent="start"
        minWidth="71px"
        position="relative"
        width="fit-content"
        color={
          position
            ? `${theme.textColor?.chatSentBubbleText}`
            : `${theme.textColor?.chatReceivedBubbleText}`
        }
      >
        <Section flexDirection="column" padding="5px 0 15px 0">
          {chat.messageContent.split('\n').map((str) => (
            <Span
              key={Math.random().toString()}
              alignSelf="start"
              textAlign="left"
              fontSize={
                position
                  ? `${theme.fontSize?.chatSentBubbleText}`
                  : `${theme.fontSize?.chatReceivedBubbleText}`
              }
              fontWeight={
                position
                  ? `${theme.fontWeight?.chatSentBubbleText}`
                  : `${theme.fontWeight?.chatReceivedBubbleText}`
              }
              color={
                position
                  ? `${theme.textColor?.chatSentBubbleText}`
                  : `${theme.textColor?.chatReceivedBubbleText}`
              }
            >
              {str}
            </Span>
          ))}
        </Section>
        <Span
          position="absolute"
          fontSize={
            position
              ? `${theme.fontSize?.chatSentBubbleTimestampText}`
              : `${theme.fontSize?.chatReceivedBubbleTimestampText}`
          }
          fontWeight={
            position
              ? `${theme.fontWeight?.chatSentBubbleTimestampText}`
              : `${theme.fontWeight?.chatReceivedBubbleTimestampText}`
          }
          color={
            position
              ? `${theme.textColor?.chatSentBubbleText}`
              : `${theme.textColor?.chatReceivedBubbleText}`
          }
          bottom="6px"
          right="10px"
        >
          {time}
        </Span>
      </Section>
    </MessageWrapper>
  );
};

const FileCard = ({
  chat,
  isGroup,
}: {
  chat: IMessagePayload;
  position: number;
  isGroup: boolean;
}) => {
  const fileContent: FileMessageContent = JSON.parse(chat.messageContent);
  const name = fileContent.name;

  const content = fileContent.content as string;
  const size = fileContent.size;

  return (
    <MessageWrapper maxWidth="fit-content" chat={chat} isGroup={isGroup}>
      <Section
        alignSelf="start"
        maxWidth="100%"
        margin="5px 0"
        background="#343536"
        borderRadius="8px"
        justifyContent="space-around"
        padding="10px 13px"
        gap="15px"
        width="fit-content"
      >
        <Image
          src={FILE_ICON(name.split('.').slice(-1)[0])}
          alt="extension icon"
          width="20px"
          height="20px"
        />
        <Section flexDirection="column" gap="5px">
          <Span color="#fff" fontSize="15px">
            {shortenText(name, 11)}
          </Span>
          <Span color="#fff" fontSize="12px">
            {formatFileSize(size)}
          </Span>
        </Section>
        <FileDownloadIconAnchor
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          <FileDownloadIcon className="fa fa-download" aria-hidden="true" />
        </FileDownloadIconAnchor>
      </Section>
    </MessageWrapper>
  );
};

const ImageCard = ({
  chat,
  position,
  isGroup,
}: {
  chat: IMessagePayload;
  position: number;
  isGroup: boolean;
}) => {
  return (
    <MessageWrapper chat={chat} isGroup={isGroup}>
      <Section
        alignSelf={position ? 'end' : 'start'}
        maxWidth="65%"
        width="fit-content"
        margin="5px 0"
      >
        <Image
          src={JSON.parse(chat.messageContent).content}
          alt=""
          width="100%"
          borderRadius={position ? '12px 0px 12px 12px' : '0px 12px 12px 12px'}
        />
      </Section>
    </MessageWrapper>
  );
};

const GIFCard = ({
  chat,
  position,
  isGroup,
}: {
  chat: IMessagePayload;
  position: number;
  isGroup: boolean;
}) => {
  return (
    <MessageWrapper chat={chat} isGroup={isGroup} maxWidth="fit-content">
      <Section
        alignSelf={position ? 'end' : 'start'}
        maxWidth="65%"
        margin="5px 0"
        width="fit-content"
      >
        <Image
          src={chat.messageContent}
          alt=""
          width="100%"
          borderRadius={position ? '12px 0px 12px 12px' : '0px 12px 12px 12px'}
        />
      </Section>
    </MessageWrapper>
  );
};

const TwitterCard = ({
  chat,
  tweetId,
  isGroup,
  position,
}: {
  chat: IMessagePayload;
  tweetId: string;
  isGroup: boolean;
  position: number;
}) => {
  return (
    <MessageWrapper chat={chat} isGroup={isGroup} maxWidth="fit-content">
      <Section
        alignSelf={position ? 'end' : 'start'}
        maxWidth="100%"
        width="fit-content"
        margin="5px 0"
      >
        <TwitterTweetEmbed tweetId={tweetId} />
      </Section>
    </MessageWrapper>
  );
};

export const ChatViewBubble = ({
  decryptedMessagePayload,
}: {
  decryptedMessagePayload: IMessagePayload;
}) => {
  const { account } = useChatData();
  const position =
    pCAIP10ToWallet(decryptedMessagePayload.fromDID).toLowerCase() !==
    account?.toLowerCase()
      ? 0
      : 1;
  const { tweetId, messageType }: TwitterFeedReturnType = checkTwitterUrl({
    message: decryptedMessagePayload?.messageContent,
  });
  const [isGroup, setIsGroup] = useState<boolean>(false);

  useEffect(() => {
    if (decryptedMessagePayload.toDID.split(':')[0] === 'eip155') {
      if (isGroup) {
        setIsGroup(false);
      }
    } else {
      if (!isGroup) {
        setIsGroup(true);
      }
    }
  }, [decryptedMessagePayload.toDID, isGroup]);

  if (messageType === 'TwitterFeedLink') {
    decryptedMessagePayload.messageType = 'TwitterFeedLink';
  }

  if (decryptedMessagePayload.messageType === 'GIF') {
    return (
      <GIFCard
        isGroup={isGroup}
        chat={decryptedMessagePayload}
        position={position}
      />
    );
  }
  if (decryptedMessagePayload.messageType === 'Image') {
    return (
      <ImageCard
        isGroup={isGroup}
        chat={decryptedMessagePayload}
        position={position}
      />
    );
  }
  if (decryptedMessagePayload.messageType === 'File') {
    return (
      <FileCard
        isGroup={isGroup}
        chat={decryptedMessagePayload}
        position={position}
      />
    );
  }
  if (decryptedMessagePayload.messageType === 'TwitterFeedLink') {
    return (
      <TwitterCard
        tweetId={tweetId}
        isGroup={isGroup}
        chat={decryptedMessagePayload}
        position={position}
      />
    );
  }
  return (
    <MessageCard
      isGroup={isGroup}
      chat={decryptedMessagePayload}
      position={position}
      account={account ?? ''}
    />
  );
};

const FileDownloadIcon = styled.i`
  color: #575757;
`;

const FileDownloadIconAnchor = styled.a`
  font-size: 20px;
`;

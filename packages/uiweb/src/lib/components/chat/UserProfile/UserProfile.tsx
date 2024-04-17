import React, { useContext, useEffect, useRef, useState } from 'react';

import { IUser } from '@pushprotocol/restapi';
import { ethers } from 'ethers';
import { ToastContainer } from 'react-toastify';
import styled from 'styled-components';

import { resolveNewEns, shortenText } from '../../../helpers';
import { useClickAway } from '../../../hooks';
import { useChatData } from '../../../hooks/chat/useChatData';
import useChatProfile from '../../../hooks/chat/useChatProfile';
import useMediaQuery from '../../../hooks/useMediaQuery';
import { Image, Section, Span } from '../../reusables';
import { ProfileContainer } from '../reusables';
import { ThemeContext } from '../theme/ThemeProvider';
import { UpdateUserProfileModal } from './UpdateUserProfileModal';

import {
  CoreContractChainId,
  InfuraAPIKey,
  ProfilePicture,
  device,
} from '../../../config';
import VerticalEllipsisIcon from '../../../icons/VerticalEllipsis.svg';
import UserProfileIcon from '../../../icons/userCircleGear.svg';
import { MODAL_BACKGROUND_TYPE, MODAL_POSITION_TYPE } from '../../../types';
import { IChatTheme, UserProfileProps } from '../exportedTypes';

/**
 * @interface IThemeProps
 * this interface is used for defining the props for styled components
 */
interface IThemeProps {
  theme?: IChatTheme;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  updateUserProfileModalBackground = MODAL_BACKGROUND_TYPE.OVERLAY,
  updateUserProfileModalPositionType = MODAL_POSITION_TYPE.GLOBAL,
}) => {
  const { user, env } = useChatData();
  const [userProfile, setUserProfile] = useState<IUser>();
  const [web3Name, setWeb3Name] = useState<string | null>(null);
  const [options, setOptions] = useState<boolean>();
  const [showUpdateUserProfileModal, setShowUpdateUserProfileModal] =
    useState<boolean>(false);
  const DropdownRef = useRef(null);
  const provider = new ethers.providers.InfuraProvider(
    CoreContractChainId[env],
    InfuraAPIKey
  );

  const theme = useContext(ThemeContext);
  const { fetchChatProfile } = useChatProfile();

  const isMobile = useMediaQuery(device.mobileL);

  useEffect(() => {
    (async () => {
      const fetchedUser = await fetchChatProfile({ user });
      if (fetchedUser) {
        const result = await resolveNewEns(fetchedUser?.wallets, provider, env);
        setWeb3Name(result);
        setUserProfile(fetchedUser);
      }
    })();
  }, [user]);
  
  useClickAway(DropdownRef, () => {
    setOptions(false);
  });

  return (
    <>
      <Conatiner
        height="inherit"
        justifyContent="space-between"
        overflow="hidden"
        width="100%"
        padding="14px 10px"
        borderRadius={theme?.borderRadius?.userProfile}
        background={theme?.backgroundColor?.userProfileBackground}
        theme={theme}
      >
        <ProfileContainer
          theme={theme}
          member={{
            web3Name: web3Name,
            abbrRecipient: shortenText(user!.account || '', 8, true) as string,
            recipient: user!.account,
            image: userProfile?.profile?.picture || null,
          }}
          copy={true}
          customStyle={{
            fontSize: theme?.fontSize?.userProfileText,
            fontWeight: theme?.fontWeight?.userProfileText,
            textColor: theme?.textColor?.userProfileText,
          }}
          loading={!userProfile ? true : false}
        />
        {userProfile && (
          <Section>
            <Image
              src={VerticalEllipsisIcon}
              height="21px"
              maxHeight="21px"
              color={theme?.iconColor?.userProfileSettings}
              width={'auto'}
              cursor="pointer"
              onClick={() => setOptions(true)}
            />
          </Section>
        )}
        {options && (
          <DropDownBar
            theme={theme}
            ref={DropdownRef}
            onClick={() => setShowUpdateUserProfileModal(true)}
          >
            <DropDownItem cursor="pointer">
              <Image
                src={UserProfileIcon}
                height="32px"
                maxHeight="32px"
                width={'auto'}
                cursor="pointer"
              />

              <TextItem cursor="pointer">Edit Profile</TextItem>
            </DropDownItem>
          </DropDownBar>
        )}
        {showUpdateUserProfileModal && (
          <UpdateUserProfileModal
            theme={theme}
            setModal={setShowUpdateUserProfileModal}
            userProfile={userProfile!}
            setUserProfile={setUserProfile}
            updateUserProfileModalBackground={updateUserProfileModalBackground}
            updateUserProfileModalPositionType={
              updateUserProfileModalPositionType
            }
          />
        )}
      </Conatiner>
      <ToastContainer />
    </>
  );
};

//styles
const Conatiner = styled(Section)<IThemeProps>`
  border: ${(props) => props.theme.border?.userProfile};
  box-sizing: border-box;
`;

const DropDownBar = styled.div`
  position: absolute;
  bottom: 13px;
  right: 29px;
  cursor: pointer;
  display: block;
  min-width: 170px;
  color: rgb(101, 119, 149);
  background: ${(props) => props.theme.backgroundColor.modalBackground};
  border: ${(props) => props.theme.border.modalInnerComponents};
  z-index: 10;
  border-radius: ${(props) => props.theme.borderRadius.modalInnerComponents};
`;
const DropDownItem = styled(Span)`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 16px;
  z-index: 3000000;
  width: 100%;
`;
const TextItem = styled(Span)`
  white-space: nowrap;
  overflow: hidden;
`;

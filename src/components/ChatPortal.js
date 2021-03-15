import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { BsFillChatDotsFill } from 'react-icons/bs';

import '../styles/ChatPortal.css';

export function ChatPortal({ isShow = true }) {
  if (isShow) {
    return createPortal(
      <Fragment>
        <div className="floating-chat">
          <BsFillChatDotsFill />
        </div>
      </Fragment>,
      document.body,
    );
  } else {
    return null;
  }
}

import * as React from 'react';
import { __ } from '../../../utils';
import { IWebsiteApp } from '../../types';

type Props = {
  websiteApp: IWebsiteApp;
  goToWebsiteApp: (name: string) => void;
  color: string;
};

function WebsiteApp(props: Props) {
  const { websiteApp, goToWebsiteApp, color } = props;

  const onClick = () => {
    const shouldOpenInNewWindow = websiteApp.credentials.openInNewWindow ?? true;

    if (shouldOpenInNewWindow) {
      handleOpenInNewWindow();
    } else {
      goToWebsiteApp(websiteApp._id);
    }
  };

  const handleOpenInNewWindow = () => {
    const url = websiteApp.credentials.url;
    
    if (!url || url.trim() === '') {
      console.warn('WebsiteApp: Invalid URL provided');
      return;
    }
    
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    
    try {
      new URL(finalUrl);
      
      window.open(finalUrl, '_blank');
      
    } catch (error) {
      console.error('WebsiteApp: Invalid URL format', error);
      alert(__('Invalid URL format. Please check the website address.'));
    }
  };
  
  return (
    <div className="websiteApp-home">
      <p>{websiteApp.credentials.description}</p>

      <button
        onClick={onClick}
        className="erxes-button btn-block"
        style={{ backgroundColor: color }}
      >
        {websiteApp.credentials.buttonText}
        {websiteApp.credentials.openInNewWindow && (
          <span style={{ marginLeft: '8px' }}>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              style={{ verticalAlign: 'middle' }}
            >
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
}

export default WebsiteApp;

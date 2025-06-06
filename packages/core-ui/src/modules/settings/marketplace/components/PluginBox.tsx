import {
  AddOns,
  Addon,
  FooterItem,
  ItemBox,
  MoreBtn,
  PerPrice,
  PluginBoxFooter,
  PluginBoxHeader,
  PluginContent
} from './styles';

import Icon from 'modules/common/components/Icon';
import { Link } from 'react-router-dom';
import React from 'react';
import { __ } from 'coreui/utils';
import { Plugin } from '../types';

type Props = {
  plugin: Plugin;
  plugins: Plugin[];
  isOpenSource?: boolean;
};

class PluginBox extends React.Component<Props, {}> {
  renderPrice(prices) {
    if (!prices || this.props.isOpenSource) {
      return <b>{__('Free')}</b>;
    }

    return (
      <PerPrice>
        <h2>${prices.monthly || 20}</h2>
        <span>{__('per month')}</span>
      </PerPrice>
    );
  }

  renderAddon() {
    const { dependencies } = this.props.plugin || {};

    const dependentPlugins = this.props.plugins.filter(item =>
      (dependencies || []).includes(item._id)
    );

    return (dependentPlugins || []).map(dependency => (
      <Addon key={dependency._id}>
        <img
          src={dependency.avatar || dependency.icon || '/images/no-plugin.png'}
          alt="dependency-plugin"
        />
        {__(dependency.title || '')}
      </Addon>
    ));
  }

  renderFooterLeftItems() {
    const { plugin } = this.props;

    if (plugin.mainType === 'power-up') {
      return (
        <AddOns>
          <span>{__('Works with')}</span>
          {this.renderAddon()}
        </AddOns>
      );
    }

    return (
      <>
        <FooterItem>
          <Icon icon="user" size={14} />
          <span>{plugin.creator ? plugin.creator.name : __('erxes Inc')}</span>
        </FooterItem>
        <FooterItem>
          <Icon icon="chart-bar" size={14} />
          <span>1,000+ active installations</span>
        </FooterItem>
      </>
    );
  }

  render() {
    const { plugin = {} as Plugin } = this.props;

    const { _id, avatar, image, icon, title, shortDescription, price } = plugin;

    return (
      <ItemBox>
        <Link to={`details/${_id}`}>
          <PluginContent>
            <PluginBoxHeader>
              <div className="image-wrapper">
                <img
                  src={avatar || image || icon || '/images/no-plugin.png'}
                  alt={title}
                />
              </div>
              {this.renderPrice(price)}
            </PluginBoxHeader>
            <h5>{__(title || "")}</h5>
            <div
              className="short-desc"
              dangerouslySetInnerHTML={{
                __html: shortDescription || ''
              }}
            />
          </PluginContent>
          <PluginBoxFooter>
            <div>{this.renderFooterLeftItems()}</div>
            <MoreBtn>
              <Icon icon="arrow-right" size={20} />
            </MoreBtn>
          </PluginBoxFooter>
        </Link>
      </ItemBox>
    );
  }
}

export default PluginBox;

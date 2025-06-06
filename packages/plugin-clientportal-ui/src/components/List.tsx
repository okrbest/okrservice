import { ActionButtons, SidebarListItem } from "@erxes/ui-settings/src/styles";
import Button from "@erxes/ui/src/components/Button";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import LoadMore from "@erxes/ui/src/components/LoadMore";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import Spinner from "@erxes/ui/src/components/Spinner";
import Tip from "@erxes/ui/src/components/Tip";
import LeftSidebar from "@erxes/ui/src/layout/components/Sidebar";
import { FieldStyle, SidebarList } from "@erxes/ui/src/layout/styles";
import { TopHeader } from "@erxes/ui/src/styles/main";
import { __ } from "coreui/utils";
import React from "react";
import { Link } from "react-router-dom";

import ClientPortalDetailContainer from "../containers/ClientPortalDetail";
import { StyledUrl } from "../styles";
import { ClientPortalConfig } from "../types";
import { useLocation } from "react-router-dom";

type Props = {
  configs: ClientPortalConfig[];
  remove: (_id?: string) => void;
  totalCount: number;
  queryParams: any;
  loading: boolean;
};

function ClientPortalList({
  configs,
  remove,
  loading,
  totalCount,
  queryParams,
}: Props) {
  const location = useLocation();

  const title = location.pathname.includes("vendor")
    ? "Vendor Portal"
    : "Client Portal";

  const kind = location.pathname.includes("vendor") ? "vendor" : "client";

  const renderRow = () => {
    return configs.map((config) => {
      const onRemove = () => {
        remove(config._id);
      };

      return (
        <SidebarListItem
          key={config._id}
          $isActive={queryParams._id === config._id}
        >
          <Link to={`?_id=${config._id}`}>
            <FieldStyle>
              {config.name}
              <StyledUrl>{config.url}</StyledUrl>
            </FieldStyle>
          </Link>
          <ActionButtons>
            <Tip text={__("Delete")} placement="bottom">
              <Button btnStyle="link" onClick={onRemove} icon="cancel-1" />
            </Tip>
          </ActionButtons>
        </SidebarListItem>
      );
    });
  };

  const renderSidebarHeader = () => {
    const addBrand = (
      <Button
        btnStyle="success"
        block={true}
        uppercase={false}
        icon="plus-circle"
      >
        {__("Add New {{title}}", { title })}
      </Button>
    );

    const content = (props) => (
      <ClientPortalDetailContainer
        {...props}
        queryParams=""
        history={history}
        kind={kind}
      />
    );

    return (
      <TopHeader>
        <ModalTrigger
          size="xl"
          title={`New ${title}`}
          trigger={addBrand}
          enforceFocus={false}
          content={content}
        />
      </TopHeader>
    );
  };

  return (
    <LeftSidebar wide={true} header={renderSidebarHeader()} hasBorder>
      <SidebarList $noTextColor $noBackground id={"ClientPortalSidebar"}>
        {renderRow()}
        <LoadMore all={totalCount} loading={loading} />
      </SidebarList>
      {loading && <Spinner />}
      {!loading && totalCount === 0 && (
        <EmptyState
          image="/images/actions/18.svg"
          text={`There is no ${title}`}
        />
      )}
    </LeftSidebar>
  );
}

export default ClientPortalList;

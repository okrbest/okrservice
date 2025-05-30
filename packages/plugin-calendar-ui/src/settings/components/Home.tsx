import EmptyState from "@erxes/ui/src/components/EmptyState";
import HeaderDescription from "@erxes/ui/src/components/HeaderDescription";
import { __ } from "coreui/utils";
import Wrapper from "@erxes/ui/src/layout/components/Wrapper";
import React from "react";
import Boards from "../containers/Boards";
import Groups from "../containers/Groups";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  boardId: string;
  queryParams: any;
};

const Home =(props:Props)=> {
    const { boardId, queryParams } = props;
    const navigate = useNavigate();
    const location = useLocation();

    const breadcrumb = [
      { title: __("Settings"), link: "/settings" },
      { title: __("Calendar"), link: `/settings/calendars` },
    ];

    return (
      <Wrapper
        header={
          <Wrapper.Header title={__("Calendar")} breadcrumb={breadcrumb} />
        }
        mainHead={
          <HeaderDescription
            icon="/images/actions/34.svg"
            title={__(`Group & Calendar`)}
            description={`${__(
              `Manage your boards and calendars so that its easy to manage incoming pop ups or requests that is adaptable to your team's needs`
            )}.${__(
              `Add in or delete boards and calendars to keep business development on track and in check`
            )}`}
          />
        }
        leftSidebar={<Boards currentBoardId={boardId} navigate={navigate} location={location} />}
        content={
          boardId ? (
            <Groups
              boardId={boardId}
              queryParams={queryParams}
              navigate={navigate}
              location={location}
            />
          ) : (
            <EmptyState
              text={`Get started on your board`}
              image="/images/actions/16.svg"
            />
          )
        }
        hasBorder={true}
        transparent={true}
      />
    );
  
}

export default Home;

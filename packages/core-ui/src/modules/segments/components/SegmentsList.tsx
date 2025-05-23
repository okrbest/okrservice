import ActionButtons from "@erxes/ui/src/components/ActionButtons";
import Button from "@erxes/ui/src/components/Button";
import DataWithLoader from "@erxes/ui/src/components/DataWithLoader";
import { EMPTY_SEGMENT_CONTENT } from "@erxes/ui-settings/src/constants";
import EmptyContent from "@erxes/ui/src/components/empty/EmptyContent";
import { ISegment } from "@erxes/ui-segments/src/types";
import Icon from "@erxes/ui/src/components/Icon";
import Label from "@erxes/ui/src/components/Label";
import { Link } from "react-router-dom";
import React from "react";
import Sidebar from "./Sidebar";
import Table from "@erxes/ui/src/components/table";
import Tip from "@erxes/ui/src/components/Tip";
import { Title } from "@erxes/ui-settings/src/styles";
import Wrapper from "@erxes/ui/src/layout/components/Wrapper";
import { __ } from "coreui/utils";

type Props = {
  contentType?: string;
  types: Array<{ contentType: string; description: string }>;
  segments: ISegment[];
  loading: boolean;
  removeSegment: (segmentId: string) => void;
};

type State = {
  expandedParentIds: string[];
};

class SegmentsList extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      expandedParentIds: []
    };
  }

  renderActionButtons(segment) {
    const { contentType, removeSegment } = this.props;

    const onClick = () => {
      removeSegment(segment._id);
    };

    return (
      <ActionButtons>
        <Tip text={__("Edit")} placement="top">
          <Link
            to={`/segments/edit?contentType=${contentType}&id=${segment._id}`}
          >
            <Button btnStyle="link" icon="edit-3" />
          </Link>
        </Tip>
        <Tip text={__("Delete")} placement="top">
          <Button btnStyle="link" onClick={onClick} icon="times-circle" />
        </Tip>
      </ActionButtons>
    );
  }

  renderTree(segments) {
    const { expandedParentIds = [] } = this.state;

    const handleExpand = parentId => {
      if (expandedParentIds.includes(parentId)) {
        return this.setState({
          expandedParentIds: expandedParentIds.filter(
            expandedParentId => expandedParentId !== parentId
          )
        });
      }

      this.setState({ expandedParentIds: [...expandedParentIds, parentId] });
    };

    return (
      <>
        {segments.map(segment => (
          <React.Fragment key={segment._id}>
            <tr key={segment._id}>
              <td>
                {!segment.subOf && !!segment?.getSubSegments?.length && (
                  <Icon
                    onClick={handleExpand.bind(this, segment._id)}
                    icon={
                      expandedParentIds.includes(segment?._id || "")
                        ? "downarrow-2"
                        : "chevron"
                    }
                    size={8}
                  />
                )}
                {segment.subOf ? "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0" : null}{" "}
                {segment.name}
              </td>
              <td>{segment.description}</td>
              <td>
                <Label lblColor={segment.color}>{segment.color}</Label>
              </td>
              <td>{this.renderActionButtons(segment)}</td>
            </tr>
            {expandedParentIds.includes(segment._id) &&
              this.renderTree(segment.getSubSegments || [])}
          </React.Fragment>
        ))}
      </>
    );
  }

  renderContent(segments) {
    return (
      <Table>
        <thead>
          <tr>
            <th>{__("Name")}</th>
            <th>{__("Description")}</th>
            <th>{__("Color")}</th>
            <th style={{ width: 80 }} />
          </tr>
        </thead>
        <tbody id={"SegmentShowing"}>{this.renderTree(segments)}</tbody>
      </Table>
    );
  }

  render() {
    const { types, contentType, loading, segments } = this.props;
    const parentSegments: ISegment[] = [];

    segments.forEach(segment => {
      if (!segment.subOf) {
        parentSegments.push(segment);
      }
    });

    const breadcrumb = [
      { title: __("Settings"), link: "/settings" },
      { title: __("Segments") }
    ];

    const title = (
      <Title $capitalize={true}>
        {contentType} {__("segments")}
      </Title>
    );

    const actionBarRight = (
      <Link
        id={"NewSegmentButton"}
        to={`/segments/new?contentType=${contentType}`}
      >
        <Button btnStyle="success" icon="plus-circle">
          New segment
        </Button>
      </Link>
    );

    const actionBar = (
      <Wrapper.ActionBar left={title} right={actionBarRight} wideSpacing />
    );

    return (
      <Wrapper
        header={
          <Wrapper.Header title={__("Segments")} breadcrumb={breadcrumb} />
        }
        actionBar={actionBar}
        content={
          <DataWithLoader
            data={this.renderContent(parentSegments)}
            loading={loading}
            count={parentSegments.length}
            emptyContent={
              <EmptyContent
                content={EMPTY_SEGMENT_CONTENT}
                maxItemWidth="330px"
              />
            }
          />
        }
        leftSidebar={<Sidebar types={types} contentType={contentType || ""} />}
        hasBorder
      />
    );
  }
}

export default SegmentsList;

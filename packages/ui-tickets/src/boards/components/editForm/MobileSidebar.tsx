import React from 'react';
import styled from 'styled-components';
import { colors, dimensions } from '@erxes/ui/src/styles';
import { __ } from '@erxes/ui/src/utils';
import { IItem, IOptions } from '../../types';
import { IUser } from '@erxes/ui/src/auth/types';
import SelectTeamMembers from '@erxes/ui/src/team/containers/SelectTeamMembers';
import SelectNewBranches from '@erxes/ui/src/team/containers/SelectNewBranches';
import SelectDepartments from '@erxes/ui/src/team/containers/SelectDepartments';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import FormGroup from '@erxes/ui/src/components/form/Group';
import { 
  MobileCard, 
  MobileSectionTitle, 
  MobileFormGroup, 
  MobileLabel 
} from './MobileLayout';

type Props = {
  item: IItem;
  saveItem: (doc: { [key: string]: any }) => void;
  sidebar?: (
    saveItem?: (doc: { [key: string]: any }) => void
  ) => React.ReactNode;
  options: IOptions;
  renderItems: () => React.ReactNode;
  updateTimeTrack: (
    {
      _id,
      status,
      timeSpent,
    }: { _id: string; status: string; timeSpent: number; startDate?: string },
    callback?: () => void
  ) => void;
  childrenSection: () => any;
  currentUser: IUser;
};

const MobileSidebarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;


const MobileControlLabel = styled(ControlLabel)`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.colorCoreDarkGray};
  margin-bottom: 8px;
`;

class MobileSidebar extends React.Component<Props> {
  render() {
    const { item, saveItem, sidebar, childrenSection, currentUser } = this.props;
    const userOnChange = (usrs) => saveItem({ assignedUserIds: usrs });
    const onChangeStructure = (values, name) => saveItem({ [name]: values });
    const assignedUserIds = (item.assignedUsers || []).map((user) => user._id);
    const branchIds = item?.branchIds;
    const departmentIds = item?.departmentIds;

    return (
      <MobileSidebarContainer>
        {/* 담당자 섹션 */}
        <MobileCard>
          <MobileSectionTitle>
            <i className="icon-user" />
            {__('Assignment')}
          </MobileSectionTitle>
          
          <MobileFormGroup>
            <MobileControlLabel>{__('Assigned to')}</MobileControlLabel>
            <SelectTeamMembers
              label={__('Choose users')}
              name="assignedUserIds"
              initialValue={assignedUserIds}
              onSelect={userOnChange}
              filterParams={{
                isAssignee: true,
                departmentIds,
                branchIds,
              }}
            />
          </MobileFormGroup>
        </MobileCard>

        {/* 조직 구조 섹션 */}
        <MobileCard>
          <MobileSectionTitle>
            <i className="icon-sitemap" />
            {__('Organization')}
          </MobileSectionTitle>
          
          <MobileFormGroup>
            <MobileControlLabel>{__('Branches')}</MobileControlLabel>
            <SelectNewBranches
              name="branchIds"
              label={__('Choose branches')}
              initialValue={item?.branchIds}
              onSelect={onChangeStructure}
              filterParams={{
                withoutUserFilter: true,
                searchValue: "search term",
              }}
            />
          </MobileFormGroup>

          <MobileFormGroup>
            <MobileControlLabel>{__('Departments')}</MobileControlLabel>
            <SelectDepartments
              name="departmentIds"
              label={__('Choose departments')}
              onSelect={onChangeStructure}
              initialValue={item?.departmentIds}
            />
          </MobileFormGroup>
        </MobileCard>

        {/* 추가 사이드바 내용 */}
        {sidebar && (
          <MobileCard>
            <MobileSectionTitle>
              <i className="icon-cog" />
              {__('Additional Settings')}
            </MobileSectionTitle>
            {sidebar(saveItem)}
          </MobileCard>
        )}

        {/* 기타 섹션들 */}
        <MobileCard>
          <MobileSectionTitle>
            <i className="icon-link" />
            {__('Related Items')}
          </MobileSectionTitle>
          {childrenSection()}
        </MobileCard>
      </MobileSidebarContainer>
    );
  }
}

export default MobileSidebar;

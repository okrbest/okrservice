import React from "react";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import CustomerDateField from "../../boards/components/editForm/CustomerDateField";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { TitleRow, ChooseDates } from "../../boards/styles/item";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import { __ } from "coreui/utils";
import { ICustomer } from "@erxes/ui-contacts/src/customers/types";
import { IItem } from "../../boards/types";
import { Alert } from "@erxes/ui/src/utils";
import mutations from "@erxes/ui-contacts/src/customers/graphql/mutations";
import fieldMutations from "@erxes/ui-forms/src/settings/properties/graphql/mutations";

const FIELDS_GROUPS_QUERY = gql`
  query fieldsGroups($contentType: String!, $isDefinedByErxes: Boolean) {
    fieldsGroups(contentType: $contentType, isDefinedByErxes: $isDefinedByErxes) {
      _id
      name
      fields {
        _id
        text
        name
        type
      }
    }
  }
`;

const ALL_FIELDS_GROUPS_QUERY = gql`
  query fieldsGroups($contentType: String!, $config: JSON) {
    fieldsGroups(contentType: $contentType, config: $config) {
      _id
      name
      fields {
        _id
        text
        name
        type
      }
    }
  }
`;

type Props = {
  item: IItem;
};

const CustomerDateFields = (props: Props) => {
  const { item } = props;
  const [forceRefetch, setForceRefetch] = React.useState(0);
  
  // Early return if item is not available
  if (!item) {
    return null;
  }
  
  // Safely get first customer
  const customers = item && item.customers ? item.customers : undefined;
  let firstCustomer: ICustomer | undefined = undefined;
  
  if (customers && Array.isArray(customers) && customers.length > 0) {
    const first = customers[0];
    if (first && typeof first === 'object' && first !== null) {
      firstCustomer = first as ICustomer;
    }
  }

  // Try without isDefinedByErxes filter first, and without config to get all groups
  const { data: allFieldsGroupsData, loading: loadingAll, refetch: refetchAll } = useQuery(ALL_FIELDS_GROUPS_QUERY, {
    variables: {
      contentType: "core:customer",
      config: null,
    },
    skip: !firstCustomer,
    fetchPolicy: "cache-and-network",
  });

  // Also try with isDefinedByErxes: false
  const { data: fieldsGroupsData, loading, error, refetch: refetchFields } = useQuery(FIELDS_GROUPS_QUERY, {
    variables: {
      contentType: "core:customer",
      isDefinedByErxes: false,
    },
    skip: !firstCustomer,
    fetchPolicy: "cache-and-network",
  });
  
  // Refetch when forceRefetch changes
  React.useEffect(() => {
    if (forceRefetch > 0 && firstCustomer) {
      refetchAll();
      refetchFields();
    }
  }, [forceRefetch, firstCustomer]);
  
  // Use allFieldsGroupsData if fieldsGroupsData is empty
  const finalFieldsGroupsData = (fieldsGroupsData?.fieldsGroups && fieldsGroupsData.fieldsGroups.length > 0) 
    ? fieldsGroupsData 
    : allFieldsGroupsData;

  const [customersEdit] = useMutation(gql(mutations.customersEdit), {
    refetchQueries: ["dealDetail", "deals"],
    awaitRefetchQueries: true,
  });

  const [fieldsAdd] = useMutation(
    fieldMutations && fieldMutations.fieldsAdd 
      ? gql(fieldMutations.fieldsAdd) 
      : gql`mutation { __typename }`,
    {
      refetchQueries: ["fieldsGroups"],
    }
  );

  if (!firstCustomer) {
    console.log("CustomerDateFields: No firstCustomer");
    return null;
  }

  if (loading || loadingAll) {
    return null;
  }

  if (error) {
    console.error("Error loading fields groups:", error);
    return null;
  }

  // Find 메일발송일 and 직전소통일 field IDs
  // First, try to find from customer's existing customFieldsData
  let mailSentDateFieldId: string | null = null;
  let lastContactDateFieldId: string | null = null;
  
  if (firstCustomer && Array.isArray(firstCustomer.customFieldsData)) {
    // Get field IDs from existing data
    const mailSentField = firstCustomer.customFieldsData.find((data: any) => {
      // We need to find the field definition to get the name
      return data.field;
    });
  }
  
  // Then try to find from fieldsGroups
  const fieldsGroups = finalFieldsGroupsData && Array.isArray(finalFieldsGroupsData.fieldsGroups) 
    ? finalFieldsGroupsData.fieldsGroups 
    : [];
  
  console.log("CustomerDateFields: fieldsGroups", fieldsGroups);
  console.log("CustomerDateFields: firstCustomer.customFieldsData", firstCustomer?.customFieldsData);
  
  if (Array.isArray(fieldsGroups) && fieldsGroups.length > 0) {
    console.log("CustomerDateFields: Total groups:", fieldsGroups.length);
    
    for (const group of fieldsGroups) {
      if (!group || typeof group !== 'object') continue;
      
      console.log("CustomerDateFields: Checking group", group.name, "with", group.fields?.length || 0, "fields");
      
      const fields = Array.isArray(group.fields) ? group.fields : [];
      for (const field of fields) {
        if (!field || !field._id) continue;
        
        const fieldName = field.text || field.name || "";
        const fieldType = field.type || "";
        
        // Log all fields to help debug
        console.log("CustomerDateFields: Field:", fieldName, "Type:", fieldType, "ID:", field._id);
        
        // More flexible matching - check various possible names
        const lowerFieldName = fieldName.toLowerCase();
        if (lowerFieldName.includes("메일") && (lowerFieldName.includes("발송") || lowerFieldName.includes("보낸"))) {
          mailSentDateFieldId = field._id;
          console.log("CustomerDateFields: ✓ Found 메일발송일 field:", fieldName, field._id);
        }
        if (lowerFieldName.includes("직전") && lowerFieldName.includes("소통")) {
          lastContactDateFieldId = field._id;
          console.log("CustomerDateFields: ✓ Found 직전소통일 field:", fieldName, field._id);
        }
      }
    }
  } else {
    console.log("CustomerDateFields: fieldsGroups is empty, trying alternative approach");
  }
  
  console.log("CustomerDateFields: mailSentDateFieldId", mailSentDateFieldId, "lastContactDateFieldId", lastContactDateFieldId);

  const handleSave = async (
    customerId: string,
    fieldIdOrName: string,
    value: Date | null
  ) => {
    if (!firstCustomer) {
      console.error("CustomerDateFields: No firstCustomer");
      return;
    }
    
    try {
      // First, try to find the actual field ID by name if we're using field name
      let actualFieldId = fieldIdOrName;
      
      // If fieldIdOrName is a field name (not an ID), try to find the field ID
      if (fieldIdOrName === "메일발송일" || fieldIdOrName === "직전소통일") {
        // Use the field IDs we found earlier
        if (fieldIdOrName === "메일발송일" && mailSentDateFieldId) {
          actualFieldId = mailSentDateFieldId;
        } else if (fieldIdOrName === "직전소통일" && lastContactDateFieldId) {
          actualFieldId = lastContactDateFieldId;
        } else {
          // Search in all fieldsGroups for a field with matching name
          const allGroups = finalFieldsGroupsData?.fieldsGroups || [];
          for (const group of allGroups) {
            if (!group || !Array.isArray(group.fields)) continue;
            for (const field of group.fields) {
              const fieldName = field.text || field.name || "";
              if (fieldName === fieldIdOrName || fieldName.includes(fieldIdOrName) || fieldIdOrName.includes(fieldName)) {
                actualFieldId = field._id;
                console.log("CustomerDateFields: Found field ID for", fieldIdOrName, ":", actualFieldId);
                break;
              }
            }
            if (actualFieldId !== fieldIdOrName) break;
          }
          
          // If still not found, create the field
          if (actualFieldId === fieldIdOrName) {
            console.log("CustomerDateFields: Field not found, creating new field:", fieldIdOrName);
            try {
              // Find or create a group for these fields (e.g., "문의" group)
              let targetGroupId: string | null = null;
              const allGroups = finalFieldsGroupsData?.fieldsGroups || [];
              
              // Try to find "문의" group
              for (const group of allGroups) {
                if (group.name === "문의" || group.name?.includes("문의")) {
                  targetGroupId = group._id;
                  break;
                }
              }
              
              // If no group found, use the first available group
              if (!targetGroupId && allGroups.length > 0 && allGroups[0]._id) {
                targetGroupId = allGroups[0]._id;
              }
              
              console.log("CustomerDateFields: Creating field with groupId:", targetGroupId);
              
              const createResult = await fieldsAdd({
                variables: {
                  contentType: "core:customer",
                  type: "date",
                  text: fieldIdOrName,
                  name: fieldIdOrName,
                  isVisible: true,
                  isVisibleInDetail: true,
                  isRequired: false,
                  groupId: targetGroupId,
                },
              });
              
              console.log("CustomerDateFields: Field creation result:", createResult);
              
              if (createResult && createResult.data && createResult.data.fieldsAdd && createResult.data.fieldsAdd._id) {
                actualFieldId = createResult.data.fieldsAdd._id;
                console.log("CustomerDateFields: Created new field with ID:", actualFieldId);
                
                // Trigger refetch to update field IDs
                setForceRefetch(prev => prev + 1);
              } else {
                console.error("CustomerDateFields: Failed to create field - no ID returned");
                Alert.error("필드를 생성할 수 없습니다. Customer Properties에서 필드를 먼저 생성해주세요.");
                return;
              }
            } catch (createError) {
              console.error("CustomerDateFields: Error creating field:", createError);
              Alert.error("필드를 생성할 수 없습니다: " + (createError.message || "Unknown error"));
              return;
            }
          }
        }
      }
      
      console.log("CustomerDateFields: Saving with fieldId:", actualFieldId, "value:", value);
      
      // Get current customFieldsData
      const currentCustomFieldsData = Array.isArray(firstCustomer.customFieldsData) 
        ? firstCustomer.customFieldsData 
        : [];
      
      // Update or add the field
      let updatedCustomFieldsData = [...currentCustomFieldsData];
      const existingFieldIndex = updatedCustomFieldsData.findIndex(
        (data: any) => data.field === actualFieldId || data.field === fieldIdOrName
      );

      if (value) {
        const fieldValue = value.toISOString();
        if (existingFieldIndex >= 0) {
          updatedCustomFieldsData[existingFieldIndex].field = actualFieldId;
          updatedCustomFieldsData[existingFieldIndex].value = fieldValue;
        } else {
          updatedCustomFieldsData.push({
            field: actualFieldId,
            value: fieldValue,
          });
        }
      } else {
        // Remove field if value is null
        if (existingFieldIndex >= 0) {
          updatedCustomFieldsData.splice(existingFieldIndex, 1);
        }
      }

      console.log("CustomerDateFields: Updated customFieldsData:", updatedCustomFieldsData);

      const result = await customersEdit({
        variables: {
          _id: customerId,
          customFieldsData: updatedCustomFieldsData,
        },
      });

      console.log("CustomerDateFields: Save result:", result);

      if (result && result.data) {
        Alert.success("Successfully updated");
        // The refetchQueries will automatically update the UI
      } else {
        Alert.error("Failed to save - no data returned");
      }
    } catch (error) {
      console.error("CustomerDateFields: Save error:", error);
      Alert.error(error.message || "Failed to save");
    }
  };

  // If fields are not found, we'll still show the date pickers
  // The fields will be created when the user saves a date
  // For now, we'll use a placeholder approach or create fields on the fly
  
  // Try to find field IDs from existing customFieldsData first
  if (!mailSentDateFieldId && firstCustomer && Array.isArray(firstCustomer.customFieldsData)) {
    // Look for any date field that might be 메일발송일
    // This is a fallback - ideally fields should be found from fieldsGroups
    console.log("CustomerDateFields: Fields not found in groups, checking customFieldsData");
  }

  // If still not found, we need to create the fields or use known field IDs
  // For now, let's show the date pickers anyway and handle field creation in handleSave
  // But we need field IDs to save, so we'll need to either:
  // 1. Create fields first, or
  // 2. Use a different approach
  
  // Since we don't have field IDs, we can't save the data properly
  // Let's show a message or create the fields dynamically
  
  // If fields are not found, we'll use field names as identifiers
  // and create/update customFieldsData using the field name
  // For now, we'll show the date pickers anyway and handle it in handleSave

  // Use field IDs if found, otherwise use field names as identifiers
  const mailSentFieldIdentifier = mailSentDateFieldId || "메일발송일";
  const lastContactFieldIdentifier = lastContactDateFieldId || "직전소통일";

  return (
    <FormGroup>
      <TitleRow>
        <ControlLabel uppercase={true}>
          {__("메일발송일 / 직전소통일")}
        </ControlLabel>
      </TitleRow>
      <ChooseDates>
        <CustomerDateField
          customer={firstCustomer}
          fieldId={mailSentFieldIdentifier}
          fieldLabel={__("메일발송일")}
          onSave={handleSave}
        />
        <CustomerDateField
          customer={firstCustomer}
          fieldId={lastContactFieldIdentifier}
          fieldLabel={__("직전소통일")}
          onSave={handleSave}
        />
      </ChooseDates>
    </FormGroup>
  );
};

export default CustomerDateFields;


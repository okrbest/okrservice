import React from 'react';
import {
  Checkbox,
  FlexWrapper,
  FormLabel,
  Input,
  Radio,
  Select,
  SelectWrapper,
} from './styles';
import Textarea from './Textarea';
import styled from 'styled-components';

type Props = {
  children?: React.ReactNode;
  id?: string;
  onChange?: (e: React.FormEvent<HTMLElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  defaultValue?: any;
  value?: any;
  defaultChecked?: boolean;
  checked?: boolean;
  placeholder?: string;
  type?: string;
  name?: string;
  options?: any[];
  required?: boolean;
  disabled?: boolean;
  round?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  onFocus?: (e: React.FormEvent<HTMLElement>) => void;
  componentClass?: string;
  min?: number;
  max?: number;
  rows?: number;
  inline?: boolean;
  className?: string;
  errors?: any;
  registerChild?: (child: any) => void;
  onBlur?: (e: React.FormEvent<HTMLElement>) => void;
  maxHeight?: number;
  maxLength?: number;
  color?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

const PasswordWrapper = styled.div`
  position: relative;
  width: 100%;
  display: block;

  input {
    padding-right: 40px !important;
  }
`;

const PasswordToggleButton = styled.button`
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  padding: 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #666 !important;
  z-index: 100 !important;
  width: 24px !important;
  height: 24px !important;
  margin: 0 !important;

  &:hover {
    color: #333 !important;
  }

  &:focus {
    outline: none !important;
  }

  svg {
    width: 18px !important;
    height: 18px !important;
    stroke: currentColor !important;
    display: block !important;
  }
`;

const renderElement = (Element, attributes, type, child) => {
  return (
    <FormLabel key={attributes.key ? attributes.key : null}>
      <Element {...attributes} type={type} />
      <span>
        {child && '\u00a0\u00a0'}
        {child}
      </span>
    </FormLabel>
  );
};

class FormControl extends React.Component<Props, { showPassword: boolean }> {
  static defaultProps = {
    componentClass: 'input',
    required: false,
    defaultChecked: false,
    disabled: false,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      showPassword: false,
    };
  }

  componentDidMount() {
    const { registerChild } = this.props;

    if (registerChild) {
      registerChild(this);
    }
  }

  togglePasswordVisibility = () => {
    this.setState((prevState) => ({
      showPassword: !prevState.showPassword,
    }));
  };

  render() {
    const props = this.props;
    const childNode = props.children;
    const elementType = props.componentClass;
    const errorMessage = props.errors && props.errors[props.name || ''];

    // cancel custom browser default form validation error
    const onChange = (e) => {
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const attributes = {
      onChange,
      onKeyPress: props.onKeyPress,
      onKeyDown: props.onKeyDown,
      onClick: props.onClick,
      onBlur: props.onBlur,
      value: props.value,
      defaultValue: props.defaultValue,
      [props.defaultChecked
        ? 'defaultChecked'
        : 'checked']: props.defaultChecked
        ? props.defaultChecked
        : props.checked,
      placeholder: props.placeholder,
      hasError: errorMessage ? true : false,
      type: props.type,
      name: props.name,
      round: props.round,
      required: props.required,
      disabled: props.disabled,
      onFocus: props.onFocus,
      autoFocus: props.autoFocus,
      autoComplete: props.autoComplete,
      min: props.min,
      max: props.max,
      id: props.id,
      maxHeight: props.maxHeight,
      maxLength: props.maxLength,
      color: props.color,
    };

    if (elementType === 'select') {
      if (props.options) {
        return (
          <FlexWrapper>
            <SelectWrapper hasError={errorMessage}>
              <Select {...attributes}>
                {props.options.map((option, index) => {
                  return (
                    <option key={index} value={option.value || ''}>
                      {option.label || ''}
                    </option>
                  );
                })}
              </Select>
            </SelectWrapper>
            {errorMessage}
          </FlexWrapper>
        );
      }

      return (
        <FlexWrapper>
          <SelectWrapper hasError={errorMessage}>
            <Select {...attributes}>{childNode}</Select>
          </SelectWrapper>
          {errorMessage}
        </FlexWrapper>
      );
    }

    if (elementType === 'radio') {
      if (props.options) {
        return props.options.map((option, index) => {
          return renderElement(
            Radio,
            { key: index, ...attributes, ...option },
            elementType,
            option.childNode
          );
        });
      }

      return renderElement(Radio, attributes, elementType, childNode);
    }

    if (elementType === 'checkbox') {
      return renderElement(Checkbox, attributes, elementType, childNode);
    }

    if (elementType === 'textarea') {
      return (
        <FlexWrapper>
          <Textarea {...props} hasError={errorMessage} />
          {errorMessage}
        </FlexWrapper>
      );
    }

    // 비밀번호 필드인 경우 아이콘 추가
    if (props.type === 'password') {
      const passwordAttributes = {
        ...attributes,
        type: this.state.showPassword ? 'text' : 'password',
      };

      return (
        <FlexWrapper>
          <PasswordWrapper>
            <Input {...passwordAttributes} />
            <PasswordToggleButton
              type="button"
              onClick={this.togglePasswordVisibility}
              aria-label={this.state.showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              title={this.state.showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {this.state.showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </PasswordToggleButton>
          </PasswordWrapper>
          {errorMessage}
        </FlexWrapper>
      );
    }

    return (
      <FlexWrapper>
        <Input {...attributes} />
        {errorMessage}
      </FlexWrapper>
    );
  }
}

export default FormControl;

import { colors, dimensions, typography } from './';

import { createGlobalStyle } from 'styled-components';

const style = `
html {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif !important;
  margin: 0;
  font-size: ${typography.fontSizeBody}px !important;
  line-height: ${typography.lineHeightBody};
  color: ${colors.textPrimary} !important;
  height: 100%;
  background: ${colors.colorWhite} !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-text-size-adjust: 100%;

  > #app {
    display: flex;
    flex: 1;
    height: 100%;
    flex-direction: column;
  }
}

button {
  cursor: pointer;
}

a {
  color: ${colors.linkPrimary};
  transition: color 0.3s ease;
}

a:hover {
  color: inherit;
  text-decoration: none;
}

.text-primary {
  color: ${colors.colorSecondary} !important;
}

.text-success {
  color: ${colors.colorCoreGreen} !important;
}

.text-warning {
  color: ${colors.colorCoreYellow} !important;
}

/* positions */

.relative {
  position: relative;
}

.absolute {
  position: absolute;
}

.w-full {
  width: 100%;
}

.h-full {
  height: 100%;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05);
}

.max-width-300 {
  max-width: 300px;
}
.max-width-300 a {
  white-space: pre-wrap !important;
  line-height: 16px;
}

/* override */

.modal {
  overflow-y: auto;
}

.modal-backdrop {
  background-color: #30435C;
} !important

.modal-backdrop.in {
  opacity: 0.8;
}

.modal.show {
  overflow-x: hidden;
  overflow-y: auto;
}

.modal.in .modal-dialog {
  transform: none;
}

.modal.in .modal-dialog.transform {
  transform: translate(0,0);
}

.modal-dialog {
  padding: 0;
  margin: 50px auto;

  &.modal-dialog-centered {
    margin: 0 auto;
  }

  &.middle {
    width: 65%;
  }

  &.full {
    width: 85%;
  }
}

.modal-1000w { 
  width: 100%;
  max-width: 1000px;
  
  @media screen and (min-width: 992px) {
    width: 1000px;
    max-width: 1000px;
  }
}

.modal-content {
  border-radius: 8x;
  border: 0;
  box-shadow: 0 2px 10px -3px rgba(0, 0, 0, 0.5);
  background: ${colors.bgLight};
}

.modal-header {
  padding: 15px 30px;
  border-bottom: 1px solid rgb(238, 238, 238);
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.modal-header .btn-close {
    --bs-btn-close-color: #000;
    --bs-btn-close-bg: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/%3E%3C/svg%3E");
    --bs-btn-close-opacity: 0.5;
    --bs-btn-close-hover-opacity: 0.75;
    --bs-btn-close-focus-shadow: 0 0 0 0.25rem #0d6efd40;
    --bs-btn-close-focus-opacity: 1;
    --bs-btn-close-disabled-opacity: 0.25;
    --bs-btn-close-white-filter: invert(1) grayscale(100%) brightness(200%);
    background: #0000 var(--bs-btn-close-bg) center/1em auto no-repeat;
    border: 0;
    border-radius: .375rem;
    box-sizing: initial;
    height: 1em;
    opacity: var(--bs-btn-close-opacity);
    padding: .25em;
    width: 1em
}

.modal-header {
  &:before, &:after {
    content: none;
  }
}

.modal-header.less-padding {
  padding: 15px 20px;
}

.modal-header .close {
  outline: 0;
  font-weight: 200;
  padding-top: 14px;
}

.modal-title {
  font-size: ${typography.fontSizeHeading7 + 2}px;
  font-weight: normal;
}

.modal-body {
  padding: 30px;

  &.md-padding {
    padding: 20px;
  }
}

.modal-body.less-padding {
  padding: 0px;
}

.modal-footer {
  padding: 0;
  margin-top: 30px;
  border: none;
}

.wide-modal {
  width: 90%;
}

.extra-wide-modal {
  max-width: 100%;
}

.close {
  font-weight: ${typography.fontWeightLight};
  text-shadow: none;
  color: ${colors.colorWhite};
  opacity: 0.8;
  font-size: 34px;
  line-height: 25px;
}

.close:hover {
  opacity: 1;
  color: ${colors.colorWhite};
}

/* transition */

.fade-in-appear,
.fade-in-enter {
  opacity: 0.1;
}

.fade-in-appear-active,
.fade-in-enter-active {
  opacity: 1;
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.fade-in-exit,
.fade-in-exit-active {
  opacity: 0.1;
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.slide-in-appear,
.slide-in-enter {
  opacity: 0;
  transform: translateY(20px);
}

.slide-in-appear-active,
.slide-in-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95) 0.2s;
}

.slide-in-exit,
.slide-in-exit-active {
  opacity: 0;
  transform: translateY(-20px);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.slide-in-small-appear,
.slide-in-small-enter {
  opacity: 0;
  transform: translateY(10px);
}

.slide-in-small-appear-active,
.slide-in-small-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.slide-in-small-exit,
.slide-in-small-exit-active {
  opacity: 0;
  transform: translateY(30px);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.slide-in-right-enter {
  transform: translateX(100%);
  opacity: 0;
}
.slide-in-right-enter-active {
  transform: translateX(0);
  opacity: 1;
  transition: transform 300ms ease, opacity 300ms ease;
}

/* Exit */
.slide-in-right-exit {
  transform: translateX(0);
  opacity: 1;
}
.slide-in-right-exit-active {
  transform: translateX(100%);
  opacity: 0;
  transition: transform 300ms ease, opacity 300ms ease;
}

.slide-in-right-appear,
.slide-in-right-enter {
  opacity: 0;
  transform: translateX(30px);
}

.slide-in-right-appear-active,
.slide-in-right-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.slide-in-right-exit,
.slide-in-right-exit-active {
  opacity: 0;
  transform: translateX(30px);
  transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.robot-appear,
.robot-enter {
  opacity: 0;
}

/* dropdown */

.dropdown-btn {
	position: relative;
	display: inline-block;
	vertical-align: middle
}

[id^="headlessui-menu-items-"], .dropdown-menu {
  margin-top: 0 !important;
  border: none;
  font-size: ${typography.fontSizeBody}px;
  color: ${colors.textPrimary};
  min-width: 100%;
  box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  right: 0;
  float: left;
  background: ${colors.colorWhite};
  border-radius: 4px;
  padding: 7px 0px;
}

[id^="headlessui-menu-items-"].menuWidthFit {
  min-width: fit-content;
  right: unset;
}

.dropdown-menu > span {
  display: block;
}

[id^="headlessui-menu-items-"] a,
[id^="headlessui-menu-items-"] button, .dropdown-menu a {
  display: block;
  padding: 3px 20px;
  color: ${colors.textPrimary};
  white-space: nowrap;
  float: none;
  margin: 0;
  width: 100%;
}

[id^="headlessui-menu-items-"] > a {
  color: ${colors.textPrimary};
  font-weight: normal;
}

[id^="headlessui-menu-items-"].active > a {
  background: ${colors.bgActive};
}

[id^="headlessui-menu-items-"] > a:focus,
[id^="headlessui-menu-items-"] > a:hover,
[id^="headlessui-menu-items-"] a:focus,
[id^="headlessui-menu-items-"] a:hover,
[id^="headlessui-menu-items-"] button:focus,
[id^="headlessui-menu-items-"] button:hover,
.dropdown-menu a:focus, .dropdown-menu a:hover {
  color: ${colors.colorCoreDarkGray};
  background: ${colors.bgActive};
  outline: 0;
  cursor: pointer;
}

.gjs-four-color, .gjs-four-color-h:hover {
  color: #6569df !important;
}

/* modal */
[id^="headlessui-dialog-panel-"] {
  transition-property: all;
  transition-timing-function: cubic-bezier(.4,0,.2,1);
  transition-duration: .15s;
  box-shadow: rgba(0, 0, 0, 0.5) 0px 2px 10px -3px;
  opacity: 1;
  vertical-align: middle;
  text-align: left;
  background: ${colors.colorWhite};
  border-radius: 8px;
  width: 500px;
  margin: 50px auto;
}

[id^="headlessui-dialog-title-"] {
  margin: 0;
  font-size: 18px;
  position: relative;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${colors.borderPrimary};
  padding: ${dimensions.coreSpacing - 5}px ${dimensions.coreSpacing + dimensions.unitSpacing}px;
}

[id^="headlessui-dialog-title-"] > i {
  cursor: pointer;
}

[id^="headlessui-description-"].dialog-description {
  padding: 20px 30px 30px;
  margin: 0;
}

@media (min-width: 600px){
  .dialog-size-lg {
    width: 800px;
  }
  .dialog-size-xl {
    width: 80%;
  }
}
@media (max-width: 576px) {
  .dialog-size-lg, .dialog-size-xl {
    width: 90%;
  }
}
@media (min-width: 1200px){
  .dialog-size-xl {
    width: 1150px;
  }
}

.dialog-size-xs {
  width: 300px;
}

/* tooltip */

.tooltip {
  font-size: 13px;
  font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;
}

.tooltip-inner {
  background-color: ${colors.colorWhite};
  color: ${colors.colorCoreDarkGray};
  box-shadow: 0 1px 10px 0 rgba(0, 0, 0, 0.23);
}

.bs-tooltip-top .arrow::before,
.bs-tooltip-auto[x-placement^="top"] .arrow::before {
	border-top-color: ${colors.colorWhite};
}

.bs-tooltip-bottom .arrow::before,
.bs-tooltip-auto[x-placement^="bottom"] .arrow::before {
	border-bottom-color: ${colors.colorWhite};
}

.bs-tooltip-right .arrow::before,
.bs-tooltip-auto[x-placement^="right"] .arrow::before {
  border-right-color: ${colors.colorWhite};
}

.bs-tooltip-left .arrow::before,
.bs-tooltip-auto[x-placement^="left"] .arrow::before {
	border-left-color: ${colors.colorWhite};
}

.tooltip.show {
	opacity: 1;
}

.bs-tooltip-right {
  padding: 0 5px 0 6px;
}

.bs-popover-top>.arrow, .bs-popover-auto[x-placement^="top"]>.arrow {
  bottom: calc((0.5rem + 1px) * -1);
}

.bs-popover-right>.arrow, .bs-popover-auto[x-placement^="right"]>.arrow {
  left:calc((0.5rem + 1px) * -1);
}

.bs-popover-bottom>.arrow, .bs-popover-auto[x-placement^="bottom"]>.arrow,.bs-popover-bottom-start>.arrow,.bs-popover-bottom-end>.arrow {
  top:calc((0.5rem + 1px) * -1);
}

.bs-popover-left>.arrow, .bs-popover-auto[x-placement^="left"]>.arrow {
  right:calc((0.5rem + 1px) * -1);
}

/* popover */

#calendar-popover {
  z-index: 1040;
}

[id^="headlessui-popover-button-"], [id^="headlessui-menu-button-"], [id^="headlessui-listbox-button-"], #rte-controls-group-dropdown-button {
  padding: 0;
  background: none;
  border: 0;
  outline: 0;
}

[id^="headlessui-menu-items-"] li {
  display: flex;
  &::marker {
    display: none;
  }
}

[id^="headlessui-listbox-options-"] {
  padding: 0;
  margin: 0;
  focus: 0;
  outline: 0;
  list-style: none;
  z-index: 5;
  position: relative;
  box-shadow: 0 0 0 1px rgba(0,0,0,.05);
  background: ${colors.colorWhite};
  border-radius: 0.25rem;
}

[id^="headlessui-listbox-options-"] span {
  border: 0;
}

[id^="headlessui-popover-panel-"] {
  font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;
  border: none;
  border-radius: 4px;
  font-size: inherit;
  padding: 0;
  color: ${colors.textPrimary};
  background-color: ${colors.colorWhite};
  word-wrap: break-word;
  z-index: 1060;
  font-weight: inherit;
  box-shadow: 0 0 20px 3px rgba(0, 0, 0, 0.15);
  max-width: 310px;
  position: absolute;
  will-change: transform;
  top: 10px;
  left: 0px;
  transform: translate3d(0px, 18px, 0px);
  transition: opacity .15s linear;
}

.bs-popover-bottom > .arrow::before,
.bs-popover-bottom-start > .arrow::before,
.bs-popover-bottom-end > .arrow::before, 
.bs-popover-auto[x-placement^="bottom"] > .arrow::before {
  top: 0;
  border-width: 0 0.5rem 0.5rem 0.5rem;
  border-bottom-color: ${colors.borderPrimary};
}

.bs-popover-bottom > .arrow::after,
.bs-popover-bottom-start > .arrow::after,
.bs-popover-bottom-end > .arrow::after,
.bs-popover-auto[x-placement^="bottom"] > .arrow::after {
  top: 1px;
  border-width: 0 0.5rem 0.5rem 0.5rem;
  border-bottom-color: ${colors.colorWhite};
}

.bs-popover-top>.arrow::before,
.bs-popover-auto[x-placement^="top"]>.arrow::before {
	border-top-color: ${colors.borderPrimary};
}

.bs-popover-right>.arrow::before,
.bs-popover-auto[x-placement^="right"]>.arrow::before {
	border-right-color: ${colors.borderPrimary};
}

.bs-popover-left>.arrow::before,
.bs-popover-auto[x-placement^="left"]>.arrow::before {
	border-left-color: ${colors.borderPrimary};
}

.popover-header {
  display: block;
  border-bottom: 1px solid ${colors.borderPrimary};
  padding: 10px 20px;
  background: ${colors.bgLight};
  font-size: ${typography.fontSizeUppercase}px;
  text-transform: uppercase;
  color: ${colors.colorCoreGray};
  border-radius: 4px 4px 0 0;
  margin: 0;

  > a {
    color: ${colors.colorCoreGray};
    float: right;
  }
}

.popover-body {
  padding: 0;
  position: relative;
  min-width: 260px;
}

.popover-body .chrome-picker {
  width: 100% !important;
  box-shadow: none !important;
}

.popover-body ul {
  max-height: 280px;
  overflow: auto;
}

.popover-body li a i {
  margin-left: 0;
}

.popover-template {
  max-width: 405px;
  width: 405px;
  height: 400px;
  display: flex;
  flex-direction: column;
  text-align: left;
}

.popover-template .popover-body {
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 33px;
}

.notification-popover {
  right: 15px !important;
  width: 360px !important;
  max-width: 360px !important; 
}

.call-popover {
  right: 15px !important;
  left: auto !important;
  width: 360px;
  max-width: 360px !important;
  position: fixed !important;
  bottom: 155px !important;
  top: auto !important;
  transform: none !important;
  border-radius: 25px;
}

.call-popover .arrow, #color-picker .arrow  {
  display: none !important;
}

#chatGroupMembers-popover {
  padding: 10px 0;
  z-index: 50;
}
#chatGroupMembers-popover .arrow {
  display: none;
}

/* select  */

.Select-control {
  height: 34px;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid ${colors.borderDarker};
  box-shadow: none;
  background: none;
}

.Select-input {
  height: 33px;
}

.Select-control:hover {
  cursor: pointer;
  box-shadow: none;
}

.Select.is-focused > .Select-control,
.Select.is-open > .Select-control {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  border-color: ${colors.colorSecondary};
  background: none;
}

.Select.is-focused:not(.is-open) > .Select-control {
  box-shadow: none;
  background: none;
  border-color: ${colors.colorSecondary};
}

.Select.is-focused .Select-input > input {
  padding: 10px 0 12px;
}

.Select.is-disabled > .Select-control {
  cursor: not-allowed;
}

.Select-placeholder,
.Select-input,
.Select--single > .Select-control .Select-value {
  padding-left: 0;
  padding-right: 0;
}

.Select-clear-zone:hover {
  color: ${colors.colorCoreRed};
}

.Select--multi .Select-multi-value-wrapper {
  padding: 0 5px 0 0;
}

.Select--multi .Select-input {
  margin-left: 0;
}

.css-1p3m7a8-multiValue {
  background-color: ${colors.colorSecondary} !important;
  border-radius: 11px !important;
  border: 1px solid ${colors.colorSecondary};
  color: ${colors.colorWhite};
  margin-top: 6px !important;
  margin-left: 0 !important;
  margin-right: 5px !important;
  position: relative;
  padding-right: 0px !important;
  padding-left: 10px !important;
}

.css-9jq23d {
  color: ${colors.colorWhite} !important;
  padding: 2px 14px 2px 0px !important;
}

.css-1nmdiq5-menu {
  .active {
    background-color: ${colors.colorSecondary} !important;
  }
}

.css-b62m3t-container {
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.css-1jqq78o-placeholder {
  color: #aaa;
}

.css-wsp0cs-MultiValueGeneric {
  color: ${colors.colorWhite} !important;
  padding: 2px 10px 2px 0px !important;
}

.css-12a83d4-MultiValueRemove {
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  width: 20px;
  height: 20px;
  border-radius: 10px !important;
  right: 0;
  top: 0;
  text-align: center;
  line-height: 20px;
  background: rgba(0, 0, 0, 0.1);
  padding: 0;
}

.css-v7duua:hover,
.css-v7duua:focus,
.css-v7duua:active,
.css-12a83d4-MultiValueRemove:hover,
.css-12a83d4-MultiValueRemove:focus,
.css-12a83d4-MultiValueRemove:active {
  background-color: rgba(0, 0, 0, 0.2) !important;
  color: ${colors.colorWhite} !important;
}

.css-v7duua {
  background: rgba(0, 0, 0, 0.1) !important;
  border-radius: 50% !important;
}

.Select--multi .Select-value-label {
  padding: 2px 10px;
}

.Select--multi.has-value .Select-input {
  margin-left: 5px;
}

.Select--multi a.Select-value-label {
  color: ${colors.colorPrimaryDark};
}

.Select-arrow-zone { 
  width: 20px;
}

.Select-arrow-zone > .Select-arrow {
  border: none;
  margin-right: 12px;
}

.Select .Select-arrow:before {
  font-family: 'erxes';
  content: '\\e9a6';
  font-size: 14px;
  color: ${colors.colorCoreGray};
}

.Select.is-open .Select-arrow:before {
  content: '\\e9c4';
}

.Select-menu-outer {
  border: none;
  margin-top: 1px;
  box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.15);
  max-height: 220px;
  z-index: 9999;
}

.Select-menu {
  max-height: 216px;
}

.Select-menu-outer, .Select-option:last-child {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.Select-option-group-label {
  background-color: ${colors.bgLight};
  color: #555;
  border-bottom: 1px solid ${colors.borderPrimary};
  border-top: 1px solid ${colors.borderPrimary};
  text-transform: capitalize;
  font-weight: bold;
  padding: 8px 20px;
  position: sticky;
  top: 0;
}

.Select-option-group-label ~ .Select-option {
  padding-left: 20px;
}

.Select-option-group-label .Select-option-group {
  padding-left: 20px;
}

.Select-option {
  padding: 8px 20px;
}

.Select-noresults {
  padding: 8px 20px;
}

.Select .Select-input {
  width: 100%;

  input {
    width: 100% !important;
  }
}

.css-13cymwt-control, .css-t3ipsp-control {
  border-top-width: 0 !important;
  border-right-width: 0 !important;
  border-left-width: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  cursor: pointer !important;
  border-color: rgb(221, 221, 221) !important;
  background: transparent !important;
}

.css-13cymwt-control > div, .css-t3ipsp-control > div {
  padding: 2px 8px 2px 0;
}

.css-t3ipsp-control, .css-t3ipsp-control:hover {
  border-color: ${colors.colorPrimary} !important;
}

.css-1xc3v61-indicatorContainer, .css-15lsz6c-indicatorContainer {
  padding: 2px !important;
}

.css-1u9des2-indicatorSeparator {
  display: none;
}

.css-tj5bde-Svg {
  height: 12px;
  width: 12px;
}

.simple-option .channel-round {
  color: ${colors.colorWhite};
  font-weight: bold;
  width: 20px;
  height: 20px;
  float: right;
  border-radius: 10px;
  background: ${colors.colorCoreYellow};
  text-align: center;
  font-size: 10px;
  line-height: 20px;
  cursor: pointer;
}

/* punch card */

.punch-card .axis path,
.punch-card .axis line {
  fill: none;
  stroke: ${colors.colorCoreGray};
  stroke-width: 1px;
  shape-rendering: crispEdges;
}
.punch-card .axis text {
  font-size: 0.875em;
  fill: ${colors.colorCoreGray};
}

/* tailwind css */

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.transition-opacity {
  transition-property: opacity;
}

.duration-700 {
  transition-duration: 700ms;
}

.opacity-0 {
  opacity: 0;
}

.opacity-100 {
  opacity: 1;
}

/* react datetime */

.rdt input {
  border: none;
  padding: 0;
  border-radius: 0;
  box-shadow: none !important;
  border-bottom: 1px solid;
  border-color: #DDD;
  background: transparent;
}

.rdt input:hover {
  border-color: #AAA;
}

.rdtPicker {
  box-shadow: 0 5px 15px -3px rgba(0, 0, 0, 0.15) !important;
  width: 100%;
  border: none !important;
  min-width: 220px;
  max-width: 290px;
  padding: 2px 4px 4px 4px;
}

.rdtPicker td.rdtToday:before {
  border-bottom: 7px solid ${colors.colorSecondary} !important;
}

.rdtPicker .rdtDay:hover, 
.rdtPicker .rdtHour:hover, 
.rdtPicker .rdtMinute:hover, 
.rdtPicker .rdtSecond:hover, 
.rdtPicker .rdtTimeToggle:hover {
  border-radius: 8px;
}

.rdtPicker td.rdtActive,
.rdtPicker td.rdtActive:hover {
  background-color: ${colors.colorSecondary} !important;
  border-radius: 8px;
}

.rdtPicker th,
.rdtPicker tfoot {
  border-color: ${colors.borderPrimary};
}

/* editor */
.RichEditor-editor .public-DraftEditor-content ul {
  padding-left: 25px;
}

.RichEditor-editor .public-DraftEditor-content ol {
  padding-left: 25px;
}

.RichEditor-editor .public-DraftEditor-content h3 {
  margin-top: 0;
}

.RichEditor-editor .RichEditor-blockquote {
  border-left: 5px solid ${colors.borderDarker};
  color: ${colors.colorCoreGray};
  font-style: italic;
  padding: 10px 20px;
}

.RichEditor-editor .public-DraftStyleDefault-pre {
  margin-bottom: 0;
}
.RichEditor-editor .public-DraftStyleDefault-pre pre {
  padding: 0;
  margin: 0;
  border: 0;
}

.RichEditor-hidePlaceholder .public-DraftEditorPlaceholder-root {
  display: none;
}

/* mention */
.draftJsMentionPlugin__mention__29BEd {
  cursor: pointer;
  display: inline-block;
  font-weight: bold;
  padding-left: 2px;
  padding-right: 2px;
  border-radius: 4px;
  text-decoration: none;
}

.draftJsMentionPlugin__mention__29BEd:visited {
  cursor: pointer;
  display: inline-block;
  font-weight: bold;
  padding-left: 2px;
  padding-right: 2px;
  text-decoration: none;
}

.draftJsMentionPlugin__mention__29BEd:hover {
  outline: 0;
}

.draftJsMentionPlugin__mention__29BEd:focus {
  outline: 0;
}

.draftJsMentionPlugin__mention__29BEd:active {
  color: ${colors.colorCoreDarkGray};
}

.draftJsMentionPlugin__mentionSuggestions__2DWjA {
  position: absolute;
  min-width: 220px;
  max-width: 480px;
  background: ${colors.colorWhite};
  box-shadow: 0 -3px 20px -2px ${colors.darkShadow};
  cursor: pointer;
  z-index: 2000;
  box-sizing: border-box;
  transform: scale(0);
  bottom: 100%;
  bottom: calc(100% + 2px);
  top: auto !important; 
  max-height: 300px;
  overflow: auto;
  border-radius: 3px;
}

.draftJsMentionPlugin__mentionSuggestionsEntry__3mSwm {
  padding: 5px 15px;
  transition: background-color 0.4s cubic-bezier(0.27, 1.27, 0.48, 0.56);
  font-size: ${typography.fontSizeBody}px;
}

.draftJsMentionPlugin__mentionSuggestionsEntry__3mSwm:active {
  background-color: ${colors.borderPrimary};
}

.draftJsMentionPlugin__mentionSuggestionsEntryFocused__3LcTd {
  background-color: ${colors.bgUnread};
}

.mentioned-person {
  cursor: pointer;
  display: inline-block;
  font-weight: bold;
  padding-left: 2px;
  padding-right: 2px;
  text-decoration: none;
}

.mention {
  text-decoration: none;
}

.mentionSuggestionsEntryContainer {
  display: flex;
}

.mentionSuggestionsEntryContainerRight {
  display: flex;
  padding-left: 8px;
  flex: 1;
  flex-direction: row;
  align-items: center;
}

.mentionSuggestionsEntryText,
.mentionSuggestionsEntryTitle {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mentionSuggestionsEntryText {
  margin-right: 8px;
  font-weight: bold;
}

.mentionSuggestionsEntryTitle {
  font-size: 95%;
  color: ${colors.colorCoreGray};
}

.mentionSuggestionsEntryAvatar {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}

/* other */
.sidebar-accordion {
  border-top: 1px solid ${colors.borderPrimary};
  border-bottom: 1px solid ${colors.borderPrimary};

  ul {
    padding-top: 0;
    max-height: none;
  }
}

.sidebar-accordion .popover-header {
  background: none;
}

.sidebar-accordion .popover-list {
  max-height: none;
}

/* carousel */
.carousel {
  position: relative;
}
.carousel-inner {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.carousel-inner > .item {
  position: relative;
  display: none;
  -webkit-transition: .6s ease-in-out left;
       -o-transition: .6s ease-in-out left;
          transition: .6s ease-in-out left;
}
.carousel-inner > .item > img,
.carousel-inner > .item > a > img {
  line-height: 1;
}
.carousel-inner > .active,
.carousel-inner > .next,
.carousel-inner > .prev {
  display: block;
}
.carousel-inner > .active {
  left: 0;
}
.carousel-inner > .next,
.carousel-inner > .prev {
  position: absolute;
  top: 0;
  width: 100%;
}
.carousel-inner > .next {
  left: 100%;
}
.carousel-inner > .prev {
  left: -100%;
}
.carousel-inner > .next.left,
.carousel-inner > .prev.right {
  left: 0;
}
.carousel-inner > .active.left {
  left: -100%;
}
.carousel-inner > .active.right {
  left: 100%;
}
.carousel-control {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 15%;
  font-size: 20px;
  color: #6569DF;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .6);
  filter: alpha(opacity=50);
  opacity: .5;
}
.carousel-control.right {
  right: 0;
  left: auto;
}
.carousel-control:hover,
.carousel-control:focus {
  color: #6569DF;
  text-decoration: none;
  filter: alpha(opacity=90);
  outline: 0;
  opacity: .9;
}
.carousel-control .icon-prev,
.carousel-control .icon-next {
  position: absolute;
  top: 50%;
  z-index: 5;
  display: inline-block;
  margin-top: -10px;
}
.carousel-control .icon-prev {
  left: 50%;
  margin-left: -10px;
}
.carousel-control .icon-next {
  right: 50%;
  margin-right: -10px;
}
.carousel-control .icon-prev,
.carousel-control .icon-next {
  width: 20px;
  height: 20px;
  font-family: serif;
  line-height: 1;
}
.carousel-control .icon-prev:before {
  content: '<';
}
.carousel-control .icon-next:before {
  content: '>';
}
.carousel-indicators {
  position: absolute;
  bottom: 10px;
  left: 50%;
  z-index: 15;
  width: 60%;
  padding-left: 0;
  margin-left: -30%;
  text-align: center;
  list-style: none;
  margin-bottom: 0;
}
.carousel-indicators li {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 1px;
  text-indent: -999px;
  cursor: pointer;
  background-color: #000;
  background-color: rgba(0, 0, 0, 0);
  border: 1px solid #EA475D;
  border-radius: 8px;
}
.carousel-indicators .active {
  width: 10px;
  height: 10px;
  margin: 0;
  background-color: #EA475D;
}

@media screen and (min-width: 768px) {
  .carousel-control .icon-prev,
  .carousel-control .icon-next {
    width: 30px;
    height: 30px;
    margin-top: -15px;
    font-size: 30px;
  },
  .carousel-control .icon-prev {
    margin-left: -15px;
  }
  .carousel-control .icon-next {
    margin-right: -15px;
  }
}

/* icon select */

.icon-option {
  display: flex;
  align-items: center;
}

.icon-option i {
  margin-right: 10px;
  font-size: ${typography.fontSizeHeading6}px;
  color: ${colors.colorPrimaryDark};
}

/* scrollbar */

::-webkit-scrollbar {
  width: 5px;
  height: 6px;
  background: transparent;
}                                                                                                                                         

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1); 
  border-width: 0px;
  border-style: solid;
  border-color: transparent;
  border-image: initial;
  border-radius: 10px;
  transition: background-color 200ms linear 0s;
} 

::-webkit-scrollbar-button, 
::-webkit-scrollbar-corner, 
::-webkit-scrollbar-resizer {
  display: none;
}

::-webkit-scrollbar-thumb:active,
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.13);
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.07);
  border-width: 0px;
  border-style: solid;
  border-color: transparent;
  border-image: initial;
  border-radius: 10px;
}

::-webkit-scrollbar-track-piece {
  background-clip: padding-box;
}

/* svg */

.checkmark {
  transform-origin: 50% 50%;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: stroke .3s cubic-bezier(0.650, 0.000, 0.450, 1.000) .1s forwards;
}

.svg-spinner-path {
  stroke: ${colors.colorCoreGray};
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 0, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -30;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -100;
  }
}

/* ckEditor */
  ul.cke_autocomplete_panel {
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 6px 2px;
    width: 240px;
    border: none;
    font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",sans-serif;;

    > li {
      padding: 5px 10px;
      line-height: 24px;
    }
  }

  .editor-avatar {
    width: 24px;
    height: 24px;
    margin-right: 7px;
    border-radius: 13px;
  }

  .editor-id {
    display: none;
  }

  .rdt {
    display: block !important;
  }

  .modal-close-date {
    width: 330px;
  }

  .modal-li{
    display: flex;
  }
  
  .modal-items-list {
    height: auto;
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  *,:after,:before{
    -webkit-box-sizing:border-box;
    -moz-box-sizing:border-box;
    box-sizing:border-box;
  }

  button,input,optgroup,select,textarea{
    margin:0;
    font:inherit;
    color:inherit
  }

  /* Tiptap */
  .tiptap {
    > * + * {
      margin-top: 0.75em;
    }

    a {
      color: #228be6;
      display: inline-flex;
    }
    
    a:hover {
      text-decoration: underline;
    }

    ul,
    ol {
      padding: 0 1rem;
    }
  
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      line-height: 1.1;
    }
  
    code {
      background-color: rgba(#616161, 0.1);
      color: #616161;
    }
  
    pre {
      background: #0D0D0D;
      color: #FFF;
      font-family: 'JetBrainsMono', monospace;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
  
      code {
        color: inherit;
        padding: 0;
        background: none;
        font-size: 0.8rem;
      }
    }
  
    img {
      max-width: 100%;
      height: auto;
    }
  
    blockquote {
      padding-left: 1rem;
      border-left: 2px solid #0d0d0d1a;
    }
  
    hr {
      border-top: 2px solid #0d0d0d1a;
      margin: 2rem 0;
    }

    table {
      border-collapse: collapse;
      margin: 0;
      overflow: hidden;
      table-layout: fixed;
      display: table;
      td,
      th {
        box-sizing: border-box;
        min-width: 1em;
        position: relative;
        vertical-align: top;
        > * {
          margin-bottom: 0;
        }
      }
  
      th {
        background-color: #f1f3f5;
        font-weight: bold;
        text-align: left;
      }
  
      .selectedCell:after {
        background: rgba(200, 200, 255, 0.4);
        content: "";
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }
  
      p {
        margin: 0;
      }
    }
  
    .tableWrapper {
      overflow-x: auto;
    }

    p.is-editor-empty:first-child::before {
      color: #adb5bd;
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
    
    .resize-cursor {
      cursor: ew-resize;
      cursor: col-resize;
    }

    .mention {
      padding-top: 0.25rem;
      padding-bottom: 0.25rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      border-radius: 0.375rem;
      border-style: solid;
      border-width: 1px;
      border-color: #93c5fd;
      line-height: 1;
      background-color: #f1f5f9;
      display: inline-block;
    }

  }

  /* ProseMirror (actual editable section of editor) */
  
  .ProseMirror{ 
    padding: 1rem;
    outline: 0px;
    height: 100%;
    overflow-y: auto;
    a {
      color: #228be6;
      display: inline-flex;
    }
    
    a:hover {
      text-decoration: underline;
    }

    &.resize-cursor {
      cursor: col-resize;
    }
    
    table {
      border-collapse: collapse;
      margin: 0;
      overflow: hidden;
      table-layout: fixed;
      display: table;

      td,
      th {
        box-sizing: border-box;
        min-width: 1em;
        position: relative;
        vertical-align: top;
        border: 1px solid #e9ecef;
        > * {
          margin-bottom: 0;
        }
      }
  
      th {
        background-color: #f1f3f5;
        font-weight: bold;
        text-align: left;
      }
  
      .selectedCell:after {
        background: rgba(200, 200, 255, 0.4);
        content: "";
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }
  
      p {
        margin: 0;
      }
    }
  
    .tableWrapper {
      overflow-x: auto;
    }

    img.ProseMirror-separator{
      display: inline !important;
      border: none !important;
      margin: 0 !important;
      width: 0 !important;
      height: 0 !important;
    }
  }
 
`;

const globalStyle = [`${style}`] as any;

globalStyle.raw = [`${style}`];

export const GlobalStyle = createGlobalStyle(globalStyle);

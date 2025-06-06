import {
  BarItems,
  Button,
  Form as CommonForm,
  PageHeader,
  Step,
  Steps,
  __,
} from "@erxes/ui/src";
import { StepWrapper } from "@erxes/ui/src/components/step/styles";
import { IButtonMutateProps, IFormProps } from "@erxes/ui/src/types";
import React from "react";
import { Link } from "react-router-dom";
import { CommonFormContainer } from "../../styles";
import { IPLan, ISchedule } from "../common/types";
import GeneralConfig from "./GeneralContent";
import SchedulesConfig from "./Schedules";
import PerformanceContent from "./PerformanceContent";

type Props = {
  plan: IPLan;
  schedule: {
    list: ISchedule[];
    removeSchedule: (_id: string) => void;
    refetch: () => void;
  };
  renderButton: (variables: IButtonMutateProps) => JSX.Element;
  forceStart: (id: string) => void;
};

type State = {
  plan: IPLan;
  useGroup: boolean;
};

class Form extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      plan: props?.plan || {},
      useGroup: false,
    };

    this.renderContent = this.renderContent.bind(this);
  }

  componentDidUpdate(prevProps: Props) {
    if (JSON.stringify(prevProps.plan) !== JSON.stringify(this.props.plan)) {
      this.setState({ plan: this.props.plan });
    }
  }

  onChange = (value, name) => {
    const { plan } = this.state;

    this.setState({ plan: { ...plan, [name]: value } });
  };

  generateDoc() {
    return this.state.plan;
  }

  renderGeneralConfig() {
    const { plan } = this.state;

    return <GeneralConfig onChange={this.onChange} plan={plan} />;
  }

  renderSchedulesContent() {
    const { schedule } = this.props;
    const { plan } = this.state;

    const updatedProps = {
      ...schedule,
      plan,
    };

    return <SchedulesConfig {...updatedProps} />;
  }

  renderContent(formProps: IFormProps) {
    const { renderButton, plan, forceStart } = this.props;

    const saveSteps = (stepNumber) => {
      const fieldName = plan ? plan._id : "create";
      const steps = JSON.parse(
        localStorage.getItem("risk_assessment_plans_active_step") || "{}"
      );

      const updateSteps = { ...steps, [fieldName]: stepNumber };

      localStorage.setItem(
        "risk_assessment_plans_active_step",
        JSON.stringify(updateSteps)
      );
    };

    const activeStep = (): number => {
      const steps = JSON.parse(
        localStorage.getItem("risk_assessment_plans_active_step") || "{}"
      );

      const fieldName = plan ? plan._id : "create";

      return steps[fieldName] || 0;
    };

    return (
      <StepWrapper>
        <Steps active={activeStep()}>
          <Step
            title="General"
            img="/images/icons/erxes-24.svg"
            noButton={plan?.status === "archived"}
            additionalButton={
              <>
                {!!plan && (
                  <Button
                    btnStyle="warning"
                    icon="archive-alt"
                    onClick={forceStart.bind(this, plan?._id)}
                  >
                    {__("Force Start")}
                  </Button>
                )}
                {renderButton({
                  ...formProps,
                  text: "Plan",
                  values: this.generateDoc(),
                  object: plan,
                })}
              </>
            }
            onClick={saveSteps}
          >
            {this.renderGeneralConfig()}
          </Step>

          {this.props.plan && (
            <Step
              title={__("Schedules")}
              img="/images/icons/erxes-21.svg"
              noButton
              onClick={saveSteps}
            >
              {this.renderSchedulesContent()}
            </Step>
          )}
          {plan?.status === "archived" && (
            <Step
              img="/images/icons/erxes-33.png"
              onClick={saveSteps}
              title="Performance"
              noButton
            >
              <PerformanceContent plan={plan} />
            </Step>
          )}
        </Steps>
      </StepWrapper>
    );
  }

  render() {
    return (
      <CommonFormContainer>
        <PageHeader>
          <BarItems>
            <Link to={`/settings/risk-assessment-plans`}>
              <Button icon="leftarrow-3" btnStyle="link">
                {__("Back")}
              </Button>
            </Link>
          </BarItems>
        </PageHeader>
        <CommonForm renderContent={this.renderContent} />
      </CommonFormContainer>
    );
  }
}

export default Form;

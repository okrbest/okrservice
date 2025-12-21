import { ChartTitle } from "../../styles";
import React, { useEffect, useState } from "react";
import { defaultLayout } from "../../utils";
import { __ } from "coreui/utils";
import ChartRenderer from "../../containers/chart/ChartRenderer";
import { IChart } from "../../types";

type Props = {
  queryParams: any;
  chart: IChart;
  chartType: string;
  showDrawer: boolean;
  chartIndex: number;
  exportTable: (chart: IChart) => void;
  setCurrentChart: (chart: IChart) => void;
  setShowDrawer: (showDrawer: boolean) => void;
  handleChartDelete: (_id: string) => void;
  dashboardChartsEdit: (_id: string, values: any) => void;
  chartDuplicate: (_id: string) => void;
  globalFilters?: any;
};

const ChartGridLayout = (props: Props) => {
  const {
    queryParams,
    chart,
    chartType,
    showDrawer,
    chartIndex,
    exportTable,
    setCurrentChart,
    setShowDrawer,
    handleChartDelete,
    dashboardChartsEdit,
    chartDuplicate,
    globalFilters = {}
  } = props;

  // Merge global filters with chart-specific filters (global filters take precedence)
  const mergedFilters = {
    ...(chart.filter || {}),
    ...globalFilters
  };

  const [filters, setFilters] = useState<any>(mergedFilters);
  const [layout, setLayout] = useState<any>(chart.layout || {});

  useEffect(() => {
    // Re-merge filters when chart filter or global filters change
    const mergedFilters = {
      ...(chart.filter || {}),
      ...globalFilters
    };
    setFilters(mergedFilters);
  }, [chart.filter, globalFilters]);

  useEffect(() => {
    if (JSON.stringify(layout) !== JSON.stringify(chart.layout)) {
      setLayout(chart.layout || {});
    }
  }, [chart.layout]);

  const setFilter = (fieldName: string, value: any) => {
    setFilters(prevFilters => {
      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && !value.length)
      ) {
        const { [fieldName]: omitted, ...updatedFilters } = prevFilters;
        return updatedFilters;
      }

      const updatedFilters = { ...prevFilters, [fieldName]: value };

      dashboardChartsEdit(chart._id, { filter: updatedFilters });

      return updatedFilters;
    });
  };

  const handleLock = () => {
    const newStatic = !layout.static;
    const updatedLayout = JSON.stringify({ ...layout, static: newStatic });

    setLayout(updatedLayout);

    dashboardChartsEdit(chart._id, { layout: updatedLayout });
  };

  const handleActionClick = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const handleTitleMouseDown = (e: React.MouseEvent) => {
    // 드래그 시작을 방지
    e.stopPropagation();
  };

  return (
    <>
      <ChartTitle onMouseDown={handleTitleMouseDown}>
        <div>{__(chart.name) || chart.name}</div>
        <span 
          className="db-chart-action" 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleActionClick(e, handleLock)}
        >
          {!layout.static ? "lock" : "unlock"}
        </span>
        <span
          className="db-chart-action"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleActionClick(e, () => chartDuplicate(chart._id))}
        >
          duplicate
        </span>
        {chartType && (chartType === "table" || chartType === "pivotTable") && (
          <span 
            className="db-chart-action"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleActionClick(e, () => exportTable(chart))}
          >
            export
          </span>
        )}
        <span
          className="db-chart-action"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleActionClick(e, () => {
            setCurrentChart(chart);
            setShowDrawer(!showDrawer);
          })}
        >
          edit
        </span>
        <span
          className="db-chart-action"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => handleActionClick(e, () => handleChartDelete(chart._id))}
        >
          delete
        </span>
      </ChartTitle>
      <ChartRenderer
        queryParams={queryParams}
        chartType={chart.chartType}
        chartHeight={defaultLayout(chart, chartIndex).h * 160}
        chartVariables={{
          serviceName: chart.serviceName,
          templateType: chart.templateType
        }}
        filter={filters}
        setFilter={setFilter}
        dimension={chart.dimension}
      />
    </>
  );
};

export default ChartGridLayout;

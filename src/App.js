import React, { useRef, useEffect, useState, memo } from "react";
import { useSpring, animated } from "react-spring";
import {
  scaleLinear as d3ScaleLinear,
  axisBottom as d3AxisBottom,
  axisLeft as d3AxisLeft,
  line as d3Line,
  median as d3Median,
  select as d3Select,
  zoom as d3Zoom,
  event as d3Event,
} from "d3";

import { fetchPayload } from "./api";

import "./App.css";

const PADDING = 20;
const maxWidth = 500;
const maxHeight = 200;

function createData(barsArray, xScale, yScale) {
  return barsArray.map(({ value, month, color }) => ({
    x: xScale(month),
    width: 40,
    height: maxHeight - PADDING - yScale(value),
    y: yScale(value),
    color,
  }));
}

function Bar({ x, width, y, height, color, onClick }) {
  const animatedHeight = useSpring({
    height,
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: {
      duration: 1000,
    },
  });
  const [{ fillOpacity }, set] = useSpring(() => ({ fillOpacity: 0.3 }));

  return (
    <animated.rect
      onMouseEnter={() => set({ fillOpacity: 0.7 })}
      onMouseLeave={() => set({ fillOpacity: 0.3 })}
      onClick={onClick}
      x={x}
      width={width}
      y={y}
      style={animatedHeight}
      height={height}
      fillOpacity={fillOpacity}
      fill={color}
      stroke={color}
      strokeWidth={2}
    />
  );
}

const Graph = memo(function ({ data }) {
  const containerRef = useRef(null);
  const xAxisRef = useRef(null);
  const yAxisRef = useRef(null);
  const [barsData, setBarsData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [meanPath, setMeanPath] = useState(null);

  useEffect(() => {
    if (data) {
      const { getBars: array } = data;
      const xScale = d3ScaleLinear()
        .domain([array[0].month, array[array.length - 1].month])
        .range([PADDING, maxWidth - PADDING]);

      const yScale = d3ScaleLinear()
        .domain([0, 90])
        .range([maxHeight - PADDING, PADDING]);

      const barsCalculations = createData(array, xScale, yScale);

      setBarsData(barsCalculations);

      const mean = d3Median(array.map(({ value }) => value));
      const line = d3Line()
        .x((d) => xScale(d.month))
        .y((d) => yScale(d.mean));

      setMeanPath(line(array.map(({ month }) => ({ month, mean }))));

      const xAxis = d3AxisBottom().scale(xScale);
      const yAxis = d3AxisLeft().scale(yScale);

      const zoom = d3Zoom()
        .scaleExtent([1, 50])
        .on("zoom", () => {
          const { transform } = d3Event;
          const updatedXScale = transform.rescaleX(xScale);

          const barsCalculations = createData(array, updatedXScale, yScale);

          setBarsData(barsCalculations);
          d3Select(xAxisRef.current).call(xAxis.scale(updatedXScale));
        });

      d3Select(containerRef.current).call(zoom);
      d3Select(xAxisRef.current).call(xAxis);
      d3Select(yAxisRef.current).call(yAxis);
    }
  }, [data]);

  return (
    <>
      <svg width={maxWidth} height={maxHeight} ref={containerRef}>
        <g>
          {barsData.map((barData, i) => (
            <Bar
              {...barData}
              key={i}
              onClick={() => setSelected(data.getBars[i])}
            />
          ))}
          <path d={meanPath} strokeWidth={2} stroke="#000" />
        </g>
        <g>
          <g ref={yAxisRef} transform={`translate(${PADDING}, 0)`} />
          <g
            ref={xAxisRef}
            transform={`translate(0, ${maxHeight - PADDING})`}
          />
        </g>
      </svg>
      <div>
        {selected && `Month: ${selected.month}, Value: ${selected.value}`}
      </div>
    </>
  );
});

function useAsyncGetPayload() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    async function get() {
      const data = await fetchPayload();

      setPayload(data);
    }

    get();
  }, []);

  return payload;
}

function App() {
  const payload = useAsyncGetPayload();

  return (
    <div className="App">
      <header className="App-header">
        <Graph data={payload} />
      </header>
    </div>
  );
}

export default App;

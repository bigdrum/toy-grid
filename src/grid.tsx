import * as React from "react";
import { AutoSizer, GridCellProps, MultiGrid, Grid } from "react-virtualized";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
import { style, cssRule } from "typestyle";
import Draggable from "react-draggable";
import "react-virtualized/styles.css"; // only needs to be imported once

function makeData(rows, columns) {
  const ret: Array<Map<number, string>> = [];

  for (let i = 0; i < rows; i++) {
    const row = new Map();
    for (let j = 0; j < columns; j++) {
      row.set(j, `r:${i}:c:${j}`);
    }
    ret.push(row);
  }
  return ret;
}

class DataStore {
  columns = Array.from(makeData(1, 1000)[0].values()).map((v, i) => {
    return `Column:${i}`;
  });
  data = makeData(10000, 1000);
  @observable dataVersion = 1;

  trackVersion = () => {
    return this.dataVersion;
  };

  @action setCell = (row, col, v) => {
    this.data[row].set(col, v);
    this.dataVersion++;
  };
}

class ColumnState {
  width: number = 100;
}

class DataView {
  @observable version = 1;

  rowViewIndexToDataIndex: Array<number> = [];
  colViewIndexToDataIndex: Array<number> = [];
  columnViewInfo = new Map<number, ColumnState>();

  constructor(public store: DataStore) {
    this.update();
  }

  getCell = (row, col) => {
    return this.store.data[this.rowViewIndexToDataIndex[row]].get(
      this.colViewIndexToDataIndex[col],
    );
  };

  setCell = (row, col, v) => {
    this.store.setCell(
      this.rowViewIndexToDataIndex[row],
      this.colViewIndexToDataIndex[col],
      v,
    );
  };

  getColumn = col => {
    return this.store.columns[this.colViewIndexToDataIndex[col]];
  };

  get numColumns() {
    return this.colViewIndexToDataIndex.length;
  }

  get numRows() {
    return this.rowViewIndexToDataIndex.length;
  }

  update = () => {
    this.rowViewIndexToDataIndex = [];
    this.store.data.forEach((row, i) => {
      // TODO: filter.
      this.rowViewIndexToDataIndex.push(i);
    });

    this.colViewIndexToDataIndex = [];
    this.store.columns.forEach((col, i) => {
      this.colViewIndexToDataIndex.push(i);
      if (!this.columnViewInfo.has(i)) {
        this.columnViewInfo.set(i, new ColumnState());
      }
    });
  };

  getColumnState = (col: number) => {
    if (col === 0) {
      return { width: 50 };
    }
    return this.columnViewInfo.get(this.colViewIndexToDataIndex[col - 1]);
  };
}

export class MyGrid extends React.Component {
  dataStore = new DataStore();
  dataView = new DataView(this.dataStore);
  render() {
    return <MyGridInner view={this.dataView} />;
  }
}

@observer
export class MyGridInner extends React.Component<{
  view: DataView;
}> {
  grid: MultiGrid = undefined;

  render() {
    const view = this.props.view;
    return (
      <div style={{ display: "flex", height: "100%", flexDirection: "column" }}>
        <h1>Hello</h1>
        <div style={{ flex: "1 1 auto" }} className={styles.grid}>
          <AutoSizer
            viewV={this.props.view.version}
            storeV={this.props.view.store.dataVersion}
          >
            {({ height, width }) => (
              <MultiGrid
                ref={r => {
                  this.grid = r;
                }}
                cellRenderer={this.cellRender}
                columnCount={view.numColumns + 1}
                columnWidth={({ index }) => {
                  return view.getColumnState(index).width;
                }}
                height={height - 20}
                rowCount={view.numRows + 1}
                rowHeight={20}
                width={width}
                fixedColumnCount={2}
                fixedRowCount={1}
                viewV={this.props.view.version}
                storeV={this.props.view.store.dataVersion}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    );
  }

  cellRender = (p: GridCellProps) => {
    const { rowIndex, columnIndex } = p;
    if (rowIndex === 0) {
      return this.columnHeaderRender(p);
    }
    if (columnIndex === 0) {
      return this.rowHeaderRender(p);
    }
    const { key, style } = p;
    if (false && p.isScrolling) {
      return (
        <div key={key} style={style} className={styles.dataCell.cell}>
          ...
        </div>
      );
    }
    const dataRow = rowIndex - 1;
    const dataCol = columnIndex - 1;
    const view = this.props.view;
    const value = view.getCell(dataRow, dataCol);
    return (
      <div
        key={key}
        style={style}
        className={styles.dataCell.cell}
        onClick={() => {
          const newV = prompt("value?", value);
          view.setCell(dataRow, dataCol, newV == null ? value : newV);
        }}
      >
        {value}
      </div>
    );
  };

  rowHeaderRender = (p: GridCellProps) => {
    const { rowIndex, key, style } = p;
    return (
      <div key={key} style={style} className={styles.rowHeader.cell}>
        {rowIndex}
      </div>
    );
  };

  columnHeaderRender = (p: GridCellProps) => {
    const { columnIndex, key, style } = p;
    const { view } = this.props;
    if (columnIndex === 0) {
      return (
        <div key={key} style={style} className={styles.columnHeader.cell} />
      );
    }
    return (
      <div key={key} style={style} className={styles.columnHeader.cell}>
        <div>{view.getColumn(columnIndex)}</div>
        <Draggable
          axis="x"
          onDrag={(event, { deltaX }) => {
            this.resizeColumn(columnIndex, deltaX);
          }}
          position={{ x: 0, y: 0 }}
        >
          <div className="a2-grid-column-resizer-holder">
            <div className="a2-grid-column-resizer" />
          </div>
        </Draggable>
      </div>
    );
  };

  @action resizeColumn = (columnIndex, deltaX) => {
    const col = this.props.view.getColumnState(columnIndex);
    col.width += deltaX;
    this.props.view.version++;
    this.grid.recomputeGridSize({ columnIndex });
  };
}

cssRule(".a2-grid-column-resizer-holder", {
  marginLeft: "auto",
  width: 6,
  cursor: "ew-resize",
  position: "absolute",
  height: "100%",
  right: 0,
  top: 0,
});

cssRule(".a2-grid-column-resizer-holder .a2-grid-column-resizer", {
  visibility: "hidden",
  backgroundColor: "#0284ff",
  position: "absolute",
  right: 0,
  width: 4,
  height: "100%",
});

cssRule(".a2-grid-column-resizer-holder:hover .a2-grid-column-resizer", {
  visibility: "visible",
});

const styles = {
  grid: style({
    border: "1px solid #d9d9d9",
  }),
  rowHeader: {
    cell: style({
      boxSizing: "border-box",
      color: "#333",
      padding: 5,
      fontSize: "12px",
      backgroundColor: "#f3f3f3",
      borderRight: "1px solid #d9d9d9",
      borderBottom: "1px solid #d9d9d9",
      textAlign: "center",
    }),
  },
  columnHeader: {
    cell: style({
      display: "flex",
      boxSizing: "border-box",
      color: "#333",
      padding: 5,
      backgroundColor: "#f3f3f3",
      borderRight: "1px solid #d9d9d9",
      borderBottom: "1px solid #d9d9d9",
      fontSize: "12px",
    }),
    resizeHandle: style({
      marginLeft: "auto",
    }),
  },
  dataCell: {
    cell: style({
      boxSizing: "border-box",
      color: "#333",
      padding: 5,
      fontSize: "12px",
      borderRight: "1px solid #d9d9d9",
      borderBottom: "1px solid #d9d9d9",
    }),
  },
};

import { DataGrid  } from "@mui/x-data-grid";
import type {GridColDef} from "@mui/x-data-grid";
import type { ExcelPreview } from "../../types/excel";


interface Props {
    data: ExcelPreview;
}


export default function DataPreview({ data }: Props) {


    const columns: GridColDef[] = data.columns.map((column) => ({
        field: column,
        headerName: column,
        width: 150,
    }));


    const rows = data.preview.map((row, index) => ({
        id: index,
        ...row
    }));


    return (

        <div style={{ marginTop: 40 }}>

            <h2>Dataset Preview</h2>


            <p>
                <b>File:</b> {data.filename}
            </p>


            <p>
                <b>Total Rows:</b> {data.rows}
            </p>


            <p>
                <b>Sheets:</b>{" "}
                {data.sheet_names.join(", ")}
            </p>


            <div style={{ height: 400, width: "100%" }}>

                <DataGrid

                    rows={rows}

                    columns={columns}

                    pageSizeOptions={[5,10,20]}

                />

            </div>


        </div>

    );

}
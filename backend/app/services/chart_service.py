import pandas as pd


class ChartService:


    @staticmethod
    def generate_chart(
        file_path,
        x_axis,
        y_axis,
        aggregation
    ):


        df = pd.read_excel(file_path)


        if aggregation == "sum":

            result = (
                df.groupby(x_axis)[y_axis]
                .sum()
            )


        elif aggregation == "average":

            result = (
                df.groupby(x_axis)[y_axis]
                .mean()
            )


        elif aggregation == "count":

            result = (
                df.groupby(x_axis)[y_axis]
                .count()
            )


        else:

            raise ValueError(
                "Unsupported aggregation"
            )


        return {

            "labels": result.index.tolist(),

            "values": result.values.tolist()

        }
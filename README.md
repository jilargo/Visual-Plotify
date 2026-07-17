# Visual-Plotify
An offline desktop app that instantly turns Excel spreadsheets (.xlsx, .csv) into interactive charts, bar graphs, and visual dashboards. Built for speed and total data privacy—all computations and data parsing happen entirely on your local machine with zero cloud connectivity or internet required.

## Plug and Play Launch
Double-click `launch-visual-plotify.bat` from the project root to start the backend and frontend together, then open the app in your browser automatically.

### Screenshots:

#### Step 1
![Step 1](./screenshot/step_1.png)

#### Step 2
![Step 2](./screenshot/step_2.png)

#### Step 3
![Step 3](./screenshot/step_3.png)

#### Step 4
![Step 4](./screenshot/step_4.png)

### If this is your first time running the app
1. Install the backend dependencies:
   - `python -m venv backend\.venv`
   - `backend\.venv\Scripts\activate`
   - `pip install -r backend\requirements.txt`
2. Install the frontend dependencies:
   - `cd frontend`
   - `npm install`
3. Then double-click `launch-visual-plotify.bat`.



> After setup, you can also create a Windows shortcut to `launch-visual-plotify.bat` and place it on your desktop for true one-click access.

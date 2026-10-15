# Campus Care

Campus Care is a campus issue reporting and activity management system.

## Project structure

```text
CampusCare/
├─ frontend/                  React + TypeScript + Vite UI
├─ backend/                   Java backend and database files
│  ├─ src/                    Java source and tests
│  ├─ database/               SQL setup files
│  ├─ pom.xml                 Maven configuration
│  ├─ Setup-LocalDatabase.ps1
│  ├─ Start-LocalDatabase.ps1
│  ├─ Stop-LocalDatabase.ps1
│  └─ Test-LiveDatabase.ps1
├─ Start-CampusCare.ps1       Starts the full application
└─ Stop-CampusCare.ps1        Stops the full application
```

## Architecture

Frontend: React + TypeScript + Vite

Backend: plain Java:

- `backend/src/main/java/com/campuscare/Main.java` starts the backend
- `backend/src/main/java/com/campuscare/ApiServer.java` exposes HTTP endpoints using Java's built-in `HttpServer`
- `backend/src/main/java/com/campuscare/Store.java` contains JDBC/database operations
- `backend/src/main/java/com/campuscare/database/DatabaseConnection.java` opens the MySQL connection

Database: MySQL 8

Flow:

`React UI -> /api -> Java HttpServer -> Store/JDBC -> MySQL`

## Run the complete project

From PowerShell in the repository root:

```powershell
cd D:\D\Java\CampusCare
.\Start-CampusCare.ps1
```

Then open:

`http://localhost:3000`

The launcher starts:

- MySQL on `127.0.0.1:3307`
- Java API on `127.0.0.1:8080`
- React frontend on `localhost:3000`

To stop everything:

```powershell
.\Stop-CampusCare.ps1
```

## First-time local database setup

The root launcher performs setup automatically when needed. To run database setup manually:

```powershell
cd D:\D\Java\CampusCare\backend
.\Setup-LocalDatabase.ps1
```

Local credentials are stored outside the repository under the current Windows user's local application data.

## Build and test the backend

```powershell
cd D:\D\Java\CampusCare\backend
$env:JAVA_HOME = 'D:\Program Files\Java\jdk-26.0.2.1'
& 'D:\Tools\apache-maven-3.10.0\bin\mvn.cmd' clean test package
```

For the optional live MySQL integration test:

```powershell
cd D:\D\Java\CampusCare\backend
.\Test-LiveDatabase.ps1
```

## Build the frontend

```powershell
cd D:\D\Java\CampusCare\frontend
npx pnpm@11.25.0 install
npx pnpm@11.25.0 build
```

## Main backend files to explain in a viva

### `Main.java`
Starts the Java API.

### `ApiServer.java`
Receives HTTP requests from React, including routes for login, reports, activities, and profile updates.

### `Store.java`
Runs SQL through JDBC using prepared statements.

### `DatabaseConnection.java`
Connects Java to MySQL using environment variables.

The React frontend never directly accesses MySQL.

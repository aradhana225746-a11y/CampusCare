# Campus Care

Campus Care is a community problem reporting and resolution system.

## Architecture

Frontend: React + TypeScript + Vite (copied from `campuscare_prototype`)

Backend: plain Java, intentionally kept small:

- `Main.java` starts the backend
- `ApiServer.java` exposes HTTP endpoints using Java's built-in `HttpServer`
- `Store.java` contains the JDBC/database operations
- `DatabaseConnection.java` opens the MySQL connection

Database: MySQL 8

There is no Spring Boot, Node backend, Firebase backend, or Java Swing frontend in the final application. All backend/database logic is Java.

Flow:

`React UI -> /api -> Java HttpServer -> Store/JDBC -> MySQL`

## Run

From PowerShell:

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

## Demo accounts

The local setup creates a demo student and a local administrator with protected local passwords. On the welcome screen use:

- **Open student demo**
- **Open admin demo**

The browser never receives the stored demo password. The Java backend reads the protected local credential and performs the login.

## Features connected to Java/MySQL

- student registration and login
- admin login
- persistent reports
- report search/filtering
- assignment, priority and five-stage status workflow
- resolution notes
- community activities
- student activity joins
- contribution points
- student profile updates
- participant list
- admin analytics calculated from real records

## Test data

The local demo seed adds:

- Water Leakage
- Broken Chair
- Overflowing Bins
- Flickering Light
- Loose Tap
- Tree Plantation
- Campus Clean-up
- Book Donation Drive
- E-Waste Collection
- Awareness Programme

The records are marked as demo data in MySQL.

## Build / test backend

```powershell
$env:JAVA_HOME = 'D:\Program Files\Java\jdk-26.0.2.1'
& 'D:\Tools\apache-maven-3.10.0\bin\mvn.cmd' clean test package
```

Unit/integration-style tests use H2 in MySQL compatibility mode. The optional live MySQL test is run with `Test-LiveDatabase.ps1`.

## Build frontend

```powershell
cd frontend
npx pnpm@11.25.0 install
npx pnpm@11.25.0 build
```

## Main backend files to explain in a viva

### `Main.java`
Starts the Java API.

### `ApiServer.java`
Receives HTTP requests from React. Examples:

- `/api/register`
- `/api/login`
- `/api/reports`
- `/api/activities`
- `/api/profile`

### `Store.java`
Runs SQL through JDBC using prepared statements.

### `DatabaseConnection.java`
Connects Java to MySQL using environment variables.

That is the complete backend path; the React frontend does not directly access MySQL.

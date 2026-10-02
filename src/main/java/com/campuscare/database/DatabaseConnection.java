package com.campuscare.database;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    private static final String URL =
            "jdbc:mysql://localhost:3306/campus_care";

    private static final String USER = "root";

    public static Connection getConnection() throws SQLException {

        String password = System.getenv("CAMPUSCARE_DB_PASSWORD");

        if (password == null || password.isBlank()) {
            throw new SQLException(
                    "CAMPUSCARE_DB_PASSWORD environment variable is not set."
            );
        }

        return DriverManager.getConnection(URL, USER, password);
    }
}
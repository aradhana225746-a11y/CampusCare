package com.campuscare.database;
import java.sql.*;
public final class DatabaseConnection {
    private DatabaseConnection() {}
    public static Connection getConnection() throws SQLException {
        String password = System.getenv("CAMPUSCARE_DB_PASSWORD");
        if (password == null) throw new SQLException("Set CAMPUSCARE_DB_PASSWORD before launching Campus Care.");
        return DriverManager.getConnection(
            System.getenv().getOrDefault("CAMPUSCARE_DB_URL", "jdbc:mysql://localhost:3306/campus_care?connectTimeout=5000&socketTimeout=15000"),
            System.getenv().getOrDefault("CAMPUSCARE_DB_USER", "root"), password);
    }
}
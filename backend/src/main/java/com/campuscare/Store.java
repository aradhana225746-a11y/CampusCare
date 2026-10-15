package com.campuscare;

import com.campuscare.database.DatabaseConnection;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.*;
import java.util.*;

/** Simple JDBC data layer used by the Java HTTP API. */
public final class Store {
    public static final String[] CATEGORIES = {
        "Water & Plumbing", "Electrical", "Furniture", "Cleanliness", "Waste Management",
        "Infrastructure", "Classroom Maintenance", "Canteen", "Other"
    };
    public static final String[] STATUSES = {"REPORTED", "ASSIGNED", "IN PROGRESS", "RESOLVED", "VERIFIED"};
    public static final String[] PRIORITIES = {"LOW", "MEDIUM", "HIGH"};

    @FunctionalInterface interface Connections { Connection open() throws SQLException; }
    private final Connections connections;

    public Store() { this(DatabaseConnection::getConnection); }
    Store(Connections connections) { this.connections = connections; }
    Connection open() throws SQLException { return connections.open(); }

    public record User(long id, String name, String email, String programme, String year, String role) {
        public boolean admin() { return "ADMIN".equals(role); }
    }

    public void initialize() throws SQLException {
        try (Connection c = connections.open(); Statement s = c.createStatement()) {
            s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_users (id BIGINT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(100) NOT NULL,email VARCHAR(190) NOT NULL UNIQUE,password_hash VARCHAR(300) NOT NULL,programme VARCHAR(100) NOT NULL DEFAULT '',study_year VARCHAR(30) NOT NULL DEFAULT '',role ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_reports (id BIGINT PRIMARY KEY AUTO_INCREMENT,user_id BIGINT NOT NULL,title VARCHAR(150) NOT NULL,category VARCHAR(60) NOT NULL,location VARCHAR(150) NOT NULL,description TEXT NOT NULL,priority ENUM('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',status ENUM('REPORTED','ASSIGNED','IN PROGRESS','RESOLVED','VERIFIED') DEFAULT 'REPORTED',assigned_to VARCHAR(150) DEFAULT '',notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES cc_users(id))");
            s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_activities (id BIGINT PRIMARY KEY AUTO_INCREMENT,title VARCHAR(150) NOT NULL,description TEXT NOT NULL,starts_at DATETIME NOT NULL,location VARCHAR(150) NOT NULL,points INT NOT NULL,status ENUM('OPEN','FULL','COMPLETED') DEFAULT 'OPEN')");
            s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_participation (activity_id BIGINT NOT NULL,user_id BIGINT NOT NULL,joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(activity_id,user_id),FOREIGN KEY(activity_id) REFERENCES cc_activities(id),FOREIGN KEY(user_id) REFERENCES cc_users(id))");
            s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_report_history (id BIGINT PRIMARY KEY AUTO_INCREMENT,report_id BIGINT NOT NULL,status VARCHAR(20) NOT NULL,notes TEXT,changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(report_id) REFERENCES cc_reports(id))");
        }
    }

    public List<Map<String, String>> query(String sql, Object... args) throws SQLException {
        try (Connection c = connections.open(); PreparedStatement p = c.prepareStatement(sql)) {
            bind(p, args);
            try (ResultSet r = p.executeQuery()) {
                List<Map<String, String>> rows = new ArrayList<>();
                while (r.next()) {
                    Map<String, String> row = new LinkedHashMap<>();
                    for (int i = 1; i <= r.getMetaData().getColumnCount(); i++) {
                        row.put(r.getMetaData().getColumnLabel(i), Objects.toString(r.getString(i), ""));
                    }
                    rows.add(row);
                }
                return rows;
            }
        }
    }

    private long execute(String sql, Object... args) throws SQLException {
        try (Connection c = connections.open(); PreparedStatement p = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bind(p, args);
            p.executeUpdate();
            try (ResultSet r = p.getGeneratedKeys()) { return r.next() ? r.getLong(1) : 0; }
        }
    }

    private static void bind(PreparedStatement p, Object... args) throws SQLException {
        for (int i = 0; i < args.length; i++) p.setObject(i + 1, args[i]);
    }

    static String hash(char[] password) throws Exception {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return "210000:" + Base64.getEncoder().encodeToString(salt) + ":" + derive(password, salt, 210000);
    }

    static boolean matches(char[] password, String stored) throws Exception {
        String[] parts = stored.split(":");
        return parts.length == 3 && MessageDigest.isEqual(
            Base64.getDecoder().decode(parts[2]),
            Base64.getDecoder().decode(derive(password, Base64.getDecoder().decode(parts[1]), Integer.parseInt(parts[0])))
        );
    }

    private static String derive(char[] password, byte[] salt, int iterations) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, 256);
        try {
            return Base64.getEncoder().encodeToString(
                SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());
        } finally {
            spec.clearPassword();
        }
    }

    public void register(String name, String email, char[] password) throws Exception {
        if (name == null || name.isBlank() || name.length() > 100 ||
            email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length() > 190 ||
            password.length < 8) {
            throw new IllegalArgumentException("Enter a name, valid email, and a password of at least 8 characters.");
        }
        try {
            execute("INSERT INTO cc_users(name,email,password_hash) VALUES(?,?,?)",
                name.strip(), email.strip().toLowerCase(Locale.ROOT), hash(password));
        } catch (SQLIntegrityConstraintViolationException e) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
    }

    public User login(String email, char[] password, boolean adminLogin) throws Exception {
        var rows = query("SELECT * FROM cc_users WHERE email=?", email.strip().toLowerCase(Locale.ROOT));
        if (rows.isEmpty() || !matches(password, rows.get(0).get("password_hash"))) {
            throw new IllegalArgumentException("Email or password is incorrect.");
        }
        var r = rows.get(0);
        User user = new User(Long.parseLong(r.get("id")), r.get("name"), r.get("email"), r.get("programme"), r.get("study_year"), r.get("role"));
        if (user.admin() != adminLogin) throw new IllegalArgumentException("Please use the login for your account role.");
        return user;
    }

    public List<Map<String, String>> reports(User user) throws SQLException {
        String sql = "SELECT r.*,u.name AS reporter FROM cc_reports r JOIN cc_users u ON u.id=r.user_id " +
            (user.admin() ? "" : "WHERE r.user_id=? ") + "ORDER BY r.id DESC";
        return user.admin() ? query(sql) : query(sql, user.id());
    }

    public long report(User user, String title, String category, String location, String description) throws Exception {
        required(title, 150); required(location, 150); required(description, 10000);
        if (!Arrays.asList(CATEGORIES).contains(category)) throw new IllegalArgumentException("Choose a valid category.");
        return execute("INSERT INTO cc_reports(user_id,title,category,location,description) VALUES(?,?,?,?,?)",
            user.id(), title.strip(), category, location.strip(), description.strip());
    }

    public void updateReport(User user, long id, String priority, String status, String assigned, String notes) throws Exception {
        requireAdmin(user);
        if (!Arrays.asList(STATUSES).contains(status) || !Arrays.asList(PRIORITIES).contains(priority)) {
            throw new IllegalArgumentException("Invalid status or priority.");
        }
        assigned = Objects.toString(assigned, "");
        notes = Objects.toString(notes, "");
        if (assigned.length() > 150 || (!"REPORTED".equals(status) && assigned.isBlank())) {
            throw new IllegalArgumentException("Assign a team before progressing the report.");
        }
        if (notes.length() > 10000) throw new IllegalArgumentException("Notes are too long.");
        if (("RESOLVED".equals(status) || "VERIFIED".equals(status)) && notes.isBlank()) {
            throw new IllegalArgumentException("Add resolution notes first.");
        }
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement p = c.prepareStatement("UPDATE cc_reports SET priority=?,status=?,assigned_to=?,notes=? WHERE id=?")) {
                    bind(p, priority, status, assigned, notes, id);
                    if (p.executeUpdate() == 0) throw new IllegalArgumentException("Report not found.");
                }
                try (PreparedStatement p = c.prepareStatement("INSERT INTO cc_report_history(report_id,status,notes) VALUES(?,?,?)")) {
                    bind(p, id, status, notes); p.executeUpdate();
                }
                c.commit();
            } catch (Exception e) {
                c.rollback();
                throw e;
            }
        }
    }

    public List<Map<String, String>> activities(User user) throws SQLException {
        return query("SELECT a.*,(SELECT COUNT(*) FROM cc_participation p WHERE p.activity_id=a.id) AS participants,(SELECT COUNT(*) FROM cc_participation p WHERE p.activity_id=a.id AND p.user_id=?) AS joined FROM cc_activities a ORDER BY starts_at DESC", user.id());
    }

    public void join(User user, long activityId) throws Exception {
        if (user.admin()) throw new IllegalArgumentException("Use a student account to participate.");
        try (Connection c = connections.open()) {
            c.setAutoCommit(false);
            try {
                try (PreparedStatement p = c.prepareStatement("SELECT status,starts_at FROM cc_activities WHERE id=? FOR UPDATE")) {
                    bind(p, activityId);
                    try (ResultSet r = p.executeQuery()) {
                        if (!r.next() || !"OPEN".equals(r.getString(1)) || r.getTimestamp(2).before(new java.util.Date())) {
                            throw new IllegalArgumentException("This activity is no longer open.");
                        }
                    }
                }
                try (PreparedStatement p = c.prepareStatement("INSERT INTO cc_participation(activity_id,user_id) VALUES(?,?)")) {
                    bind(p, activityId, user.id()); p.executeUpdate();
                }
                c.commit();
            } catch (SQLIntegrityConstraintViolationException e) {
                c.rollback();
                throw new IllegalArgumentException("You're already participating.");
            } catch (Exception e) {
                c.rollback();
                throw e;
            }
        }
    }

    public void activity(User user, long id, String title, String description, String date, String location, int points, String status) throws Exception {
        requireAdmin(user);
        required(title, 150); required(description, 10000); required(location, 150);
        if (!List.of("OPEN", "FULL", "COMPLETED").contains(status)) throw new IllegalArgumentException("Invalid activity status.");
        java.time.LocalDateTime.parse(date, java.time.format.DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm").withResolverStyle(java.time.format.ResolverStyle.STRICT));
        if (points < 0 || points > 10000) throw new IllegalArgumentException("Points must be between 0 and 10000.");
        if (id == 0) {
            execute("INSERT INTO cc_activities(title,description,starts_at,location,points,status) VALUES(?,?,?,?,?,?)",
                title.strip(), description.strip(), date, location.strip(), points, status);
        } else {
            execute("UPDATE cc_activities SET title=?,description=?,starts_at=?,location=?,points=?,status=? WHERE id=?",
                title.strip(), description.strip(), date, location.strip(), points, status, id);
        }
    }

    public void profile(User user, String name, String programme, String year) throws Exception {
        required(name, 100);
        programme = Objects.toString(programme, "");
        year = Objects.toString(year, "");
        if (programme.length() > 100 || year.length() > 30) throw new IllegalArgumentException("Programme or year is too long.");
        execute("UPDATE cc_users SET name=?,programme=?,study_year=? WHERE id=?", name.strip(), programme.strip(), year.strip(), user.id());
    }

    public void password(User user, char[] oldPassword, char[] newPassword) throws Exception {
        var row = query("SELECT password_hash FROM cc_users WHERE id=?", user.id()).get(0);
        if (!matches(oldPassword, row.get("password_hash"))) throw new IllegalArgumentException("Current password is incorrect.");
        if (newPassword.length < 8) throw new IllegalArgumentException("Use at least 8 characters.");
        execute("UPDATE cc_users SET password_hash=? WHERE id=?", hash(newPassword), user.id());
    }

    private static void required(String value, int max) {
        if (value == null || value.isBlank() || value.length() > max) {
            throw new IllegalArgumentException("Required fields must contain 1-" + max + " characters.");
        }
    }

    private static void requireAdmin(User user) {
        if (!user.admin()) throw new SecurityException("Administrator access required.");
    }
}

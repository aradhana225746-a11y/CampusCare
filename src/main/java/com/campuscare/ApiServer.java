package com.campuscare;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

/**
 * Small HTTP API for the React frontend.
 * No framework: Java HttpServer + JDBC Store + Gson.
 */
public final class ApiServer {
    private final Store store;
    private final Gson gson = new GsonBuilder().serializeNulls().create();
    private final Map<String, Store.User> sessions = new ConcurrentHashMap<>();

    public ApiServer(Store store) {
        this.store = store;
    }

    public void start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/health", this::health);
        server.createContext("/api/register", this::register);
        server.createContext("/api/login", this::login);
        server.createContext("/api/demo-login", this::demoLogin);
        server.createContext("/api/logout", this::logout);
        server.createContext("/api/state", this::state);
        server.createContext("/api/reports", this::reports);
        server.createContext("/api/activities", this::activities);
        server.createContext("/api/profile", this::profile);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        System.out.println("Campus Care Java API running at http://127.0.0.1:" + port);
    }

    private void health(HttpExchange x) throws IOException {
        run(x, () -> send(x, 200, Map.of("ok", true, "backend", "Java", "database", "MySQL")));
    }

    private void register(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "POST");
            RegisterRequest body = body(x, RegisterRequest.class);
            char[] password = chars(body.password());
            try {
                store.register(text(body.name()), text(body.email()), password);
            } finally {
                Arrays.fill(password, '\0');
            }
            send(x, 201, Map.of("message", "Account created"));
        });
    }

    private void login(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "POST");
            LoginRequest body = body(x, LoginRequest.class);
            char[] password = chars(body.password());
            Store.User user;
            try {
                user = store.login(text(body.email()), password, body.admin());
            } finally {
                Arrays.fill(password, '\0');
            }
            sendSession(x, user);
        });
    }

    private void demoLogin(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "POST");
            DemoLoginRequest body = body(x, DemoLoginRequest.class);
            String prefix = body.admin() ? "ADMIN" : "DEMO";
            String email = System.getenv("CAMPUSCARE_" + prefix + "_EMAIL");
            String secret = System.getenv("CAMPUSCARE_" + prefix + "_PASSWORD");
            if (email == null || secret == null) {
                throw new IllegalStateException("Demo accounts are not configured for this launch.");
            }
            char[] password = secret.toCharArray();
            try {
                sendSession(x, store.login(email, password, body.admin()));
            } finally {
                Arrays.fill(password, '\0');
            }
        });
    }

    private void logout(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "POST");
            String token = token(x);
            if (token != null) sessions.remove(token);
            send(x, 200, Map.of("ok", true));
        });
    }

    private void state(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "GET");
            send(x, 200, snapshot(requireUser(x)));
        });
    }

    private void reports(HttpExchange x) throws IOException {
        run(x, () -> {
            Store.User user = requireUser(x);
            String path = x.getRequestURI().getPath();
            if (path.equals("/api/reports") && x.getRequestMethod().equals("POST")) {
                ReportRequest body = body(x, ReportRequest.class);
                store.report(user, text(body.title()), text(body.category()), text(body.location()), text(body.description()));
                send(x, 201, snapshot(user));
                return;
            }
            if (path.startsWith("/api/reports/") && x.getRequestMethod().equals("PUT")) {
                long id = number(path.substring("/api/reports/".length()), "report id");
                ReportUpdateRequest body = body(x, ReportUpdateRequest.class);
                store.updateReport(user, id, text(body.priority()), text(body.status()), text(body.assignedTo()), text(body.resolutionNotes()));
                send(x, 200, snapshot(user));
                return;
            }
            throw new IllegalArgumentException("Unsupported reports request.");
        });
    }

    private void activities(HttpExchange x) throws IOException {
        run(x, () -> {
            Store.User user = requireUser(x);
            String path = x.getRequestURI().getPath();
            if (path.equals("/api/activities") && x.getRequestMethod().equals("POST")) {
                ActivityRequest body = body(x, ActivityRequest.class);
                store.activity(user, 0, text(body.title()), text(body.description()), apiDate(body.dateTime()), text(body.location()), body.points(), text(body.status()));
                send(x, 201, snapshot(user));
                return;
            }
            if (path.endsWith("/join") && x.getRequestMethod().equals("POST")) {
                String idPart = path.substring("/api/activities/".length(), path.length() - "/join".length());
                store.join(user, number(idPart, "activity id"));
                send(x, 200, snapshot(user));
                return;
            }
            if (path.startsWith("/api/activities/") && x.getRequestMethod().equals("PUT")) {
                long id = number(path.substring("/api/activities/".length()), "activity id");
                ActivityRequest body = body(x, ActivityRequest.class);
                store.activity(user, id, text(body.title()), text(body.description()), apiDate(body.dateTime()), text(body.location()), body.points(), text(body.status()));
                send(x, 200, snapshot(user));
                return;
            }
            throw new IllegalArgumentException("Unsupported activities request.");
        });
    }

    private void profile(HttpExchange x) throws IOException {
        run(x, () -> {
            requireMethod(x, "PUT");
            Store.User user = requireUser(x);
            ProfileRequest body = body(x, ProfileRequest.class);
            store.profile(user, text(body.name()), text(body.program()), text(body.year()));
            Store.User refreshed = new Store.User(user.id(), text(body.name()), user.email(), text(body.program()), text(body.year()), user.role());
            replaceSession(x, refreshed);
            send(x, 200, snapshot(refreshed));
        });
    }

    private void sendSession(HttpExchange x, Store.User user) throws Exception {
        String token = UUID.randomUUID().toString();
        sessions.put(token, user);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", token);
        result.put("state", snapshot(user));
        send(x, 200, result);
    }

    private Map<String, Object> snapshot(Store.User user) throws Exception {
        List<Map<String, String>> rawReports = store.reports(user);
        List<Map<String, String>> rawActivities = store.activities(user);

        List<Map<String, Object>> reports = rawReports.stream().map(this::reportJson).toList();
        List<Map<String, Object>> activities = rawActivities.stream().map(this::activityJson).toList();

        List<Map<String, String>> joined = store.query(
            "SELECT a.id,a.title,a.points,p.joined_at FROM cc_participation p JOIN cc_activities a ON a.id=p.activity_id WHERE p.user_id=? ORDER BY p.joined_at DESC",
            user.id());
        int activityPoints = joined.stream().mapToInt(r -> Integer.parseInt(r.get("points"))).sum();
        long resolved = rawReports.stream().filter(r -> Set.of("RESOLVED", "VERIFIED").contains(r.get("status"))).count();

        List<Map<String, Object>> contributions = joined.stream().map(r -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", "con-" + r.get("id"));
            item.put("amount", Integer.parseInt(r.get("points")));
            item.put("label", r.get("title"));
            item.put("date", displayDate(r.get("joined_at")));
            return item;
        }).toList();

        Map<String, Object> student = new LinkedHashMap<>();
        student.put("name", user.name());
        student.put("program", user.programme());
        student.put("year", user.year());
        student.put("email", user.email());
        student.put("role", user.role());
        student.put("contributionPoints", activityPoints + (int) resolved * 20);
        student.put("activitiesJoined", joined.size());
        student.put("joinedActivityIds", joined.stream().map(r -> "act-" + r.get("id")).toList());
        student.put("contributions", contributions);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("student", student);
        result.put("reports", reports);
        result.put("activities", activities);
        result.put("participants", user.admin() ? participants() : List.of());
        return result;
    }

    private List<Map<String, Object>> participants() throws Exception {
        String sql = "SELECT u.id,u.name,u.programme," +
            "(SELECT COUNT(*) FROM cc_reports r WHERE r.user_id=u.id) reports," +
            "(SELECT COUNT(*) FROM cc_reports r WHERE r.user_id=u.id AND r.status IN ('RESOLVED','VERIFIED')) resolved," +
            "(SELECT COUNT(*) FROM cc_participation p WHERE p.user_id=u.id) activities," +
            "((SELECT COALESCE(SUM(a.points),0) FROM cc_participation p JOIN cc_activities a ON a.id=p.activity_id WHERE p.user_id=u.id)+" +
            "20*(SELECT COUNT(*) FROM cc_reports r WHERE r.user_id=u.id AND r.status IN ('RESOLVED','VERIFIED'))) points " +
            "FROM cc_users u WHERE u.role='STUDENT' ORDER BY points DESC,u.name";
        return store.query(sql).stream().map(r -> {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("name", r.get("name"));
            p.put("programme", r.get("programme"));
            p.put("reports", Integer.parseInt(r.get("reports")));
            p.put("resolved", Integer.parseInt(r.get("resolved")));
            p.put("points", Integer.parseInt(r.get("points")));
            p.put("activity", r.get("activities") + " activities");
            return p;
        }).toList();
    }

    private Map<String, Object> reportJson(Map<String, String> r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", "CC-" + r.get("id"));
        m.put("title", r.get("title"));
        m.put("category", r.get("category"));
        m.put("location", r.get("location"));
        m.put("description", r.get("description"));
        m.put("date", displayDate(r.get("created_at")));
        m.put("priority", r.get("priority"));
        m.put("status", r.get("status"));
        m.put("assignedTo", r.get("assigned_to"));
        m.put("resolutionNotes", r.get("notes"));
        m.put("reporter", r.get("reporter"));
        return m;
    }

    private Map<String, Object> activityJson(Map<String, String> r) {
        long id = Long.parseLong(r.get("id"));
        String[] icons = {"leaf", "recycle", "book", "spark", "megaphone"};
        String[] accents = {"sage", "blue", "peach", "lilac", "yellow"};
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", "act-" + id);
        m.put("title", r.get("title"));
        m.put("description", r.get("description"));
        m.put("date", displayDate(r.get("starts_at")));
        m.put("time", displayTime(r.get("starts_at")));
        m.put("dateTime", inputDate(r.get("starts_at")));
        m.put("location", r.get("location"));
        m.put("participants", Integer.parseInt(r.get("participants")));
        m.put("points", Integer.parseInt(r.get("points")));
        m.put("status", r.get("status"));
        m.put("icon", icons[(int) ((id - 1) % icons.length)]);
        m.put("accent", accents[(int) ((id - 1) % accents.length)]);
        return m;
    }

    private Store.User requireUser(HttpExchange x) {
        String token = token(x);
        Store.User user = token == null ? null : sessions.get(token);
        if (user == null) throw new SecurityException("Please sign in first.");
        return user;
    }

    private void replaceSession(HttpExchange x, Store.User user) {
        String token = token(x);
        if (token != null) sessions.put(token, user);
    }

    private String token(HttpExchange x) {
        String auth = x.getRequestHeaders().getFirst("Authorization");
        return auth != null && auth.startsWith("Bearer ") ? auth.substring(7) : null;
    }

    private <T> T body(HttpExchange x, Class<T> type) throws IOException {
        String json = new String(x.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        T value = gson.fromJson(json, type);
        if (value == null) throw new IllegalArgumentException("Request body is required.");
        return value;
    }

    private void run(HttpExchange x, Checked action) throws IOException {
        cors(x);
        if (x.getRequestMethod().equals("OPTIONS")) {
            x.sendResponseHeaders(204, -1);
            x.close();
            return;
        }
        try {
            action.run();
        } catch (SecurityException e) {
            send(x, 403, Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            send(x, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            send(x, 500, Map.of("error", Objects.toString(e.getMessage(), "Server error")));
        }
    }

    private void send(HttpExchange x, int status, Object value) throws IOException {
        byte[] bytes = gson.toJson(value).getBytes(StandardCharsets.UTF_8);
        x.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        x.sendResponseHeaders(status, bytes.length);
        x.getResponseBody().write(bytes);
        x.close();
    }

    private void cors(HttpExchange x) {
        x.getResponseHeaders().set("Access-Control-Allow-Origin", "http://localhost:3000");
        x.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        x.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    }

    private static void requireMethod(HttpExchange x, String method) {
        if (!x.getRequestMethod().equals(method)) throw new IllegalArgumentException("Use " + method + " for this request.");
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }

    private static char[] chars(String value) {
        return text(value).toCharArray();
    }

    private static long number(String value, String label) {
        try {
            String clean = value.replace("CC-", "").replace("act-", "");
            return Long.parseLong(clean);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid " + label + ".");
        }
    }

    private static String apiDate(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Choose a date and time.");
        return value.replace('T', ' ');
    }

    private static LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Timestamp.valueOf(value).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(value.replace(' ', 'T'));
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private static String displayDate(String value) {
        LocalDateTime date = parseDate(value);
        return date == null ? value : date.format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
    }

    private static String displayTime(String value) {
        LocalDateTime date = parseDate(value);
        return date == null ? "" : date.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    private static String inputDate(String value) {
        LocalDateTime date = parseDate(value);
        return date == null ? "" : date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
    }

    @FunctionalInterface
    private interface Checked { void run() throws Exception; }

    private record RegisterRequest(String name, String email, String password) {}
    private record LoginRequest(String email, String password, boolean admin) {}
    private record DemoLoginRequest(boolean admin) {}
    private record ReportRequest(String title, String category, String location, String description) {}
    private record ReportUpdateRequest(String priority, String status, String assignedTo, String resolutionNotes) {}
    private record ActivityRequest(String title, String description, String dateTime, String location, int points, String status) {}
    private record ProfileRequest(String name, String program, String year) {}
}

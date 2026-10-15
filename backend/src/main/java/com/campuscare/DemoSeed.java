package com.campuscare;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.Arrays;

/** Explicitly requested demo records, never run during normal startup. */
public final class DemoSeed {
    private DemoSeed() {}
    public static final String EMAIL="demo.student@campuscare.invalid";
    public static boolean run(Store store,char[] password) throws Exception {
        try {
            if(password.length<8) throw new IllegalArgumentException("Choose a demo password of at least 8 characters.");
            store.initialize();
            try(Connection c=store.open()) {
                try(Statement s=c.createStatement()) {
                    s.executeUpdate("CREATE TABLE IF NOT EXISTS cc_demo_seed (seed_key VARCHAR(80) PRIMARY KEY,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                }
                c.setAutoCommit(false);
                try {
                    try(PreparedStatement p=c.prepareStatement("SELECT seed_key FROM cc_demo_seed WHERE seed_key=? FOR UPDATE")) {
                        p.setString(1,"campus-care-demo-v1");
                        try(ResultSet r=p.executeQuery()) { if(r.next()){c.rollback();return false;} }
                    }
                    insert(c,"INSERT INTO cc_demo_seed(seed_key) VALUES(?)","campus-care-demo-v1");
                    long student=insert(c,"INSERT INTO cc_users(name,email,password_hash,programme,study_year) VALUES(?,?,?,?,?)",
                        "Student User",EMAIL,Store.hash(password),"Computer Science","2");
                    String[][] reports={
                        {"Water Leakage","Water & Plumbing","Block B","Water is leaking near the washroom and making the floor slippery.","HIGH","IN PROGRESS","Facilities","Replacement valve ordered."},
                        {"Broken Chair","Furniture","Room 204","A chair has a broken support and needs replacement.","MEDIUM","RESOLVED","Campus Operations","Chair replaced."},
                        {"Overflowing Bins","Waste Management","Main Block","The dry-waste bins near the main block are overflowing.","LOW","REPORTED","",""},
                        {"Flickering Light","Electrical","Library East Wing","A corridor light near the library entrance is flickering.","MEDIUM","ASSIGNED","Electrical Desk","Inspection scheduled."},
                        {"Loose Tap","Canteen","North Canteen","The handwash tap is loose and does not close properly.","LOW","VERIFIED","Canteen Services","Repair verified."}
                    };
                    for(String[] r:reports) {
                        long report=insert(c,"INSERT INTO cc_reports(user_id,title,category,location,description,priority,status,assigned_to,notes) VALUES(?,?,?,?,?,?,?,?,?)",
                            student,r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7]);
                        insert(c,"INSERT INTO cc_report_history(report_id,status,notes) VALUES(?,?,?)",report,r[5],"Initial status recorded. "+r[7]);
                    }
                    String[] titles={"Tree Plantation","Campus Clean-up","Book Donation Drive","E-Waste Collection","Awareness Programme"};
                    int[] points={60,50,40,30,25};
                    for(int i=0;i<titles.length;i++) {
                        long activity=insert(c,"INSERT INTO cc_activities(title,description,starts_at,location,points,status) VALUES(?,?,?,?,?,?)",
                            titles[i],new String[]{"Plant shade trees along the library walkway.","A student-led clean-up of shared campus spaces.","Donate books for the student reading shelf.","Collect unused chargers, batteries, and small electronics for recycling.","A short student-led awareness session on campus sustainability."}[i],
                            Timestamp.valueOf(LocalDateTime.now().plusDays(7+i*2).withHour(10).withMinute(0).withSecond(0).withNano(0)),
                            new String[]{"Library Walkway","Central Quad","Student Commons","Main Gate","Seminar Hall 2"}[i],points[i],"OPEN");
                        if(i<2)insert(c,"INSERT INTO cc_participation(activity_id,user_id) VALUES(?,?)",activity,student);
                    }
                    c.commit();return true;
                } catch(Exception e) { c.rollback();throw e; }
            }
        } finally { Arrays.fill(password,'\0'); }
    }
    private static long insert(Connection c,String sql,Object... args) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
            for(int i=0;i<args.length;i++)p.setObject(i+1,args[i]);
            p.executeUpdate();
            try(ResultSet r=p.getGeneratedKeys()){
                if(!r.next())return 0;
                Object key=r.getObject(1);
                return key instanceof Number n?n.longValue():0;
            }
        }
    }
}

package com.campuscare;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@EnabledIfEnvironmentVariable(named="CAMPUSCARE_LIVE_TESTS",matches="true")
class LiveMySqlTest {
    @Test void liveRegistrationLoginReportAdminActivityAndPersistence() throws Exception {
        Store store=new Store();store.initialize();
        assertTrue(System.getenv("CAMPUSCARE_DB_URL").startsWith("jdbc:mysql://127.0.0.1:3307/campus_care"));
        var demo=store.login(DemoSeed.EMAIL,System.getenv("CAMPUSCARE_DEMO_PASSWORD").toCharArray(),false);
        var admin=store.login(System.getenv("CAMPUSCARE_ADMIN_EMAIL"),System.getenv("CAMPUSCARE_ADMIN_PASSWORD").toCharArray(),true);
        assertEquals(5,store.reports(demo).size());
        assertEquals(5,store.activities(demo).stream().filter(a->a.get("title").startsWith("[DEMO]")).count());
        assertFalse(DemoSeed.run(store,System.getenv("CAMPUSCARE_DEMO_PASSWORD").toCharArray()));
        String suffix=UUID.randomUUID().toString().substring(0,8);
        String email="livecheck-"+suffix+"@campuscare.invalid";
        char[] password=UUID.randomUUID().toString().toCharArray();
        store.register("[DEMO CHECK] Student",email,password);
        var student=store.login(email,password,false);
        long id=store.report(student,"[DEMO CHECK] Light "+suffix,"Electrical","Demo test room","Live MySQL workflow verification.");
        assertEquals("REPORTED",store.reports(student).get(0).get("status"));
        for(String status:new String[]{"ASSIGNED","IN PROGRESS","RESOLVED","VERIFIED"})
            store.updateReport(admin,id,"HIGH",status,"Demo Facilities","Live check: repair verified.");
        assertEquals("VERIFIED",new Store().reports(student).get(0).get("status"));
        assertEquals(4,store.query("SELECT id FROM cc_report_history WHERE report_id=?",id).size());
        assertThrows(SecurityException.class,()->store.updateReport(student,id,"HIGH","RESOLVED","Team","Notes"));
        String date=LocalDateTime.now().plusDays(10).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        String title="[DEMO CHECK] Activity "+suffix;
        store.activity(admin,0,title,"Live MySQL workflow verification.",date,"Demo Quad",35,"OPEN");
        long activity=Long.parseLong(store.query("SELECT id FROM cc_activities WHERE title=?",title).get(0).get("id"));
        store.join(student,activity);
        assertThrows(IllegalArgumentException.class,()->store.join(student,activity));
        var row=new Store().activities(student).stream().filter(a->a.get("id").equals(Long.toString(activity))).findFirst().orElseThrow();
        assertEquals("1",row.get("participants"));assertEquals("1",row.get("joined"));
        store.profile(student,"[DEMO CHECK] Updated Student","Computer Science","3");
        assertEquals("3",new Store().login(email,password,false).year());
        java.util.Arrays.fill(password,'\0');
        try(var c=store.open();var p=c.prepareStatement("SELECT CURRENT_USER(),VERSION(),@@port");var r=p.executeQuery()){
            assertTrue(r.next());assertTrue(r.getString(1).startsWith("campuscare@"));assertEquals(3307,r.getInt(3));
        }
    }
}

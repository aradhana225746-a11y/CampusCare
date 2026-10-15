package com.campuscare;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.*;
import java.sql.*;
import java.util.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

class StoreTest {
    Store store;
    Store.User student,admin;
    String url;
    @BeforeEach void setup() throws Exception {
        // H2's MySQL mode verifies JDBC workflows without touching the user's MySQL database.
        url="jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        store=new Store(()->DriverManager.getConnection(url));
        store.initialize();store.initialize();
        store.register("Student","student@example.com","correct-password".toCharArray());
        store.register("Admin","admin@example.com","admin-password".toCharArray());
        try(var c=DriverManager.getConnection(url);var p=c.prepareStatement("UPDATE cc_users SET role='ADMIN' WHERE email=?")) {p.setString(1,"admin@example.com");p.executeUpdate();}
        student=store.login("STUDENT@example.com","correct-password".toCharArray(),false);
        admin=store.login("admin@example.com","admin-password".toCharArray(),true);
    }
    @Test void authenticationAndRoleBoundaries() throws Exception {
        assertThrows(IllegalArgumentException.class,()->store.login("student@example.com","wrong".toCharArray(),false));
        assertThrows(IllegalArgumentException.class,()->store.login("student@example.com","correct-password".toCharArray(),true));
        assertThrows(IllegalArgumentException.class,()->store.login("' OR 1=1 --","correct-password".toCharArray(),false));
        assertThrows(IllegalArgumentException.class,()->store.register("Duplicate","student@example.com","password123".toCharArray()));
        assertThrows(IllegalArgumentException.class,()->store.register("Name","invalid","short".toCharArray()));
        store.password(student,"correct-password".toCharArray(),"changed-password".toCharArray());
        assertThrows(IllegalArgumentException.class,()->store.login("student@example.com","correct-password".toCharArray(),false));
        assertEquals(student.id(),store.login("student@example.com","changed-password".toCharArray(),false).id());
    }
    @Test void hashesAreSaltedAndDoNotContainPassword() throws Exception {
        String first=Store.hash("password123".toCharArray()),second=Store.hash("password123".toCharArray());
        assertNotEquals(first,second);assertFalse(first.contains("password123"));
        assertTrue(Store.matches("password123".toCharArray(),first));assertFalse(Store.matches("bad".toCharArray(),first));
    }
    @Test void reportOwnershipUpdatesAndHistory() throws Exception {
        long id=store.report(student,"Leaking tap","Water & Plumbing","Block B","Steady leak");
        store.register("Other","other@example.com","other-password".toCharArray());
        var other=store.login("other@example.com","other-password".toCharArray(),false);
        assertTrue(store.reports(other).isEmpty());assertEquals(1,store.reports(admin).size());
        assertThrows(SecurityException.class,()->store.updateReport(student,id,"HIGH","ASSIGNED","Facilities",""));
        assertThrows(IllegalArgumentException.class,()->store.updateReport(admin,id,"HIGH","ASSIGNED","",""));
        assertThrows(IllegalArgumentException.class,()->store.updateReport(admin,id,"HIGH","RESOLVED","Facilities",""));
        for(String status:Store.STATUSES)store.updateReport(admin,id,"HIGH",status,"Facilities","Repair documented");
        var r=store.reports(student).get(0);assertEquals("VERIFIED",r.get("status"));assertEquals("HIGH",r.get("priority"));
        assertEquals(5,store.query("SELECT * FROM cc_report_history WHERE report_id=?",id).size());
        assertThrows(IllegalArgumentException.class,()->store.report(student,"","Other","B","Description"));
    }
    @Test void activityParticipationIsUniqueAndPersisted() throws Exception {
        String future=LocalDateTime.now().plusDays(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        store.activity(admin,0,"Clean-up","Care for campus",future,"Quad",50,"OPEN");
        var a=store.activities(student).get(0);long id=Long.parseLong(a.get("id"));
        assertThrows(SecurityException.class,()->store.activity(student,0,"Title","Details",future,"Quad",50,"OPEN"));
        store.join(student,id);
        assertThrows(IllegalArgumentException.class,()->store.join(student,id));
        a=store.activities(student).get(0);assertEquals("1",a.get("participants"));assertEquals("1",a.get("joined"));
        store.activity(admin,id,"Clean-up","Updated",future,"Quad",50,"FULL");
        store.register("Other","other@example.com","other-password".toCharArray());
        var other=store.login("other@example.com","other-password".toCharArray(),false);
        assertThrows(IllegalArgumentException.class,()->store.join(other,id));
        assertThrows(Exception.class,()->store.activity(admin,0,"Title","Details","2026-02-30 10:00","Quad",50,"OPEN"));
        store.profile(student,"Updated name","Computer Science","2");
        assertEquals("Updated name",store.login("student@example.com","correct-password".toCharArray(),false).name());
    }
}


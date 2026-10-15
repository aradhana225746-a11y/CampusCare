package com.campuscare;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import java.sql.*;
import java.util.UUID;

class DemoSeedTest {
    Store store;
    String url;
    @BeforeEach void setup() {
        url="jdbc:h2:mem:seed"+UUID.randomUUID()+";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1";
        store=new Store(()->DriverManager.getConnection(url));
    }
    @Test void seedIsRepeatableAndPreservesExistingData() throws Exception {
        store.initialize();
        store.register("Real Student","real@example.com","existing-password".toCharArray());
        var real=store.login("real@example.com","existing-password".toCharArray(),false);
        store.report(real,"Real issue","Other","Campus","Existing data");
        char[] password="test-demo-password".toCharArray();
        assertTrue(DemoSeed.run(store,password));
        for(char c:password)assertEquals('\0',c);
        var demo=store.login(DemoSeed.EMAIL,"test-demo-password".toCharArray(),false);
        assertFalse(demo.admin());
        assertEquals(5,store.reports(demo).size());
        assertEquals(5,store.activities(demo).size());
        assertEquals(2,store.activities(demo).stream().filter(a->a.get("joined").equals("1")).count());
        try(var c=DriverManager.getConnection(url);var s=c.createStatement()){
            s.executeUpdate("UPDATE cc_reports SET notes='Edited after seed' WHERE user_id="+demo.id());
        }
        assertFalse(DemoSeed.run(store,"another-demo-password".toCharArray()));
        assertEquals(demo.id(),store.login(DemoSeed.EMAIL,"test-demo-password".toCharArray(),false).id());
        assertEquals(5,store.reports(demo).size());
        assertTrue(store.reports(demo).stream().allMatch(r->r.get("notes").equals("Edited after seed")));
        assertEquals("Real issue",store.reports(real).get(0).get("title"));
        assertEquals(5,store.query("SELECT * FROM cc_report_history").size());
    }
    @Test void collidingAccountRollsBackEntireSeed() throws Exception {
        store.initialize();
        store.register("Existing Owner",DemoSeed.EMAIL,"existing-password".toCharArray());
        assertThrows(SQLException.class,()->DemoSeed.run(store,"demo-password".toCharArray()));
        assertTrue(store.query("SELECT * FROM cc_reports").isEmpty());
        assertTrue(store.query("SELECT * FROM cc_activities").isEmpty());
        assertTrue(store.query("SELECT * FROM cc_demo_seed").isEmpty());
        assertEquals("Existing Owner",store.login(DemoSeed.EMAIL,"existing-password".toCharArray(),false).name());
    }
}

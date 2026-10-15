package com.campuscare;
import java.util.Arrays;
public final class LocalSetup {
    private LocalSetup() {}
    public static void prepare(Store store) throws Exception {
        String email=System.getenv("CAMPUSCARE_ADMIN_EMAIL");
        String adminSecret=System.getenv("CAMPUSCARE_ADMIN_PASSWORD");
        String demoSecret=System.getenv("CAMPUSCARE_DEMO_PASSWORD");
        if(email==null||adminSecret==null||demoSecret==null)throw new IllegalArgumentException("Run Start-CampusCare.ps1 -PrepareLocal using the protected local configuration.");
        store.initialize();
        char[] password=adminSecret.toCharArray();
        try {
            if(store.query("SELECT id FROM cc_users WHERE email=?",email).isEmpty()){
                store.register("Administrator",email,password);
                try(var c=store.open();var p=c.prepareStatement("UPDATE cc_users SET role='ADMIN' WHERE email=?")){
                    p.setString(1,email);p.executeUpdate();
                }
            }
            store.login(email,password,true);
        }finally{Arrays.fill(password,'\0');}
        boolean created=DemoSeed.run(store,demoSecret.toCharArray());
        System.out.println(created?"Local accounts and sample data ready.":"Local accounts verified; existing sample data preserved.");
    }
}

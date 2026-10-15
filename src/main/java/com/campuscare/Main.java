package com.campuscare;

import java.util.Arrays;

public final class Main {
    public static void main(String[] args) throws Exception {
        Store store = new Store();
        var options = Arrays.asList(args);

        if (options.contains("--check-db")) {
            store.initialize();
            System.out.println("Database connected; schema ready.");
            return;
        }
        if (options.contains("--prepare-local")) {
            LocalSetup.prepare(store);
            return;
        }
        if (options.contains("--seed-demo")) {
            String value = System.getenv("CAMPUSCARE_DEMO_PASSWORD");
            if (value == null) throw new IllegalArgumentException("CAMPUSCARE_DEMO_PASSWORD is not set.");
            DemoSeed.run(store, value.toCharArray());
            System.out.println("Demo data ready.");
            return;
        }

        store.initialize();
        new ApiServer(store).start(8080);
    }
}

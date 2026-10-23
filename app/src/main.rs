use std::sync::Arc;
use std::{fmt, io, time::Duration};
use storegram::types::Login::{Connect, Verification};
use storegram::{
    store_gram::{
        Store,
        macros::{StoreTable, StoreTableTrait},
    },
    types::TelegramAPP,
};
//use storegram::store_gram::macros;
//use storegram::types;

#[derive(StoreTable)]
#[allow(unused)]
struct User {
    nome: String,
    idade: u8,
}

#[derive(StoreTable)]
#[allow(unused)]
struct Images {
    path: String,
    size: u8,
}

#[derive(StoreTable)]
#[allow(unused)]
struct Games {
    path: String,
    price: u8,
}

#[tokio::main]
async fn main() {
    let app = TelegramAPP::new(
        "3aa9ede81264c73813f1885f5ff23382",
        29750333,
        "+553298602810",
    );

    let login_attemp = Store::try_connect(app).await.expect("erro ao conectar");
    let store = match login_attemp {
        Verification((token, client)) => {
            let mut code = String::new();

            println!("Digite o codigo que chegou");
            io::stdin().read_line(&mut code).unwrap();

            Store::verify_code(client, token, code).await.unwrap()
        }

        Connect(stt) => stt,
    };

    {
        let mut lock_store = store.lock().await;
        lock_store.create_db("UserDB").await.unwrap();
    }

    Store::create_table::<User>(Arc::clone(&store))
        .await
        .expect("erro ao criar table user");
    Store::create_table::<Images>(Arc::clone(&store))
        .await
        .expect("erro ao criar table images");
    Store::create_table::<Games>(Arc::clone(&store))
        .await
        .expect("erro ao criar table games");

    for table in store.lock().await.show_db_tables() {
        println!("{:?}", table)
    }

    let value = User {
        nome: "Luiz".to_string(),
        idade: 10,
    };

    // {
    //     let mut lock_store = store.lock().await;
    //     lock_store.insert::<User>(value).await;
    // }

    {
        let lock_store = store.lock().await;
        lock_store.get().await
    }
}

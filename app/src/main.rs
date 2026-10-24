use std::sync::Arc;
use std::{fmt, io};
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
        let db_creation_result = lock_store.create_db("UserDB").await;

        if db_creation_result.is_err() {
            println!("ERRO AO CRIAR 'UserDB'");
            return;
        }
    }

    Store::create_table::<User>(Arc::clone(&store), String::from("UserDB"))
        .await
        .unwrap();

    store.lock().await.get(String::from("UserDB")).await;

    Store::from_::<User>()
        .select(["Nome", "Idade"])
        .where_(|user| user.idade > 25)
        .run();
}

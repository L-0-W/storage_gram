mod store_gram;
mod types;
mod manager;

use std::sync::{Arc};

use store_gram::{Store};
use store_macros::StoreTable;
use types::{TelegramAPP, StoreTableTrait};


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
    size: u8
}

#[derive(StoreTable)]
#[allow(unused)]
struct Games {
    path: String,
    price: u8
}

#[tokio::main]
async fn main(){

    let app = TelegramAPP::new("3aa9ede81264c73813f1885f5ff23382", 29750333, "+5532998602810");
    
    let store = Store::connect(app).await.expect("erro ao conectar");
    
    store.lock().await.create_db("UserDB").await.unwrap();

    Store::create_table::<User>(Arc::clone(&store)).await.expect("erro ao criar table user");
    Store::create_table::<Images>(Arc::clone(&store)).await.expect("erro ao criar table images");
    Store::create_table::<Games>(Arc::clone(&store)).await.expect("erro ao criar table games");

    
    for table in store.lock().await.show_db_tables() {
        println!("{:?}", table)
    }
   

    let value = User {nome: "Luiz".to_string(), idade: 10};
    store.lock().await.insert::<User>(value).await;
}

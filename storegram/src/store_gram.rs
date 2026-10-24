use std::{collections::hash_map::Values, io, sync::Arc};

use grammers_client::client::LoginToken;
//use grammers_client::peer::Peer;
use grammers_client::{Client, InvocationError, SenderPool, message::InputMessage, peer::User};
use grammers_session::storages::SqliteSession;
use grammers_tl_types::enums::messages::ForumTopics;
use grammers_tl_types::enums::{ForumTopic, InputPeer, Message};
use grammers_tl_types::types::{InputChannel, InputPeerChannel};

use crate::manager::{File, SearchResult};
use crate::types::{
    Channel, Database, Login, Result, ResultErrs, SelectFilters, StoreTableTrait, TelegramAPP,
};

use grammers_tl_types::{self as tl, enums::Updates};

pub struct Store {
    #[allow(unused)]
    session_path: String,
    #[allow(unused)]
    user: User,
    client: Client,
    databases: Vec<Database>,
}

impl Store {
    pub async fn verify_code(
        client: Client,
        token: LoginToken,
        code: String,
    ) -> Result<Arc<tokio::sync::Mutex<Self>>> {
        let Ok(user) = client.sign_in(&token, &code.trim()).await else {
            return Err("Codigo errado".into());
        };

        let store_obj = Self {
            session_path: String::from("./session.gram"),
            user: user,
            client,
            databases: Vec::new(),
        };

        let return_obj = Arc::new(tokio::sync::Mutex::new(store_obj));

        return Ok(return_obj);
    }
    pub async fn try_connect(app: TelegramAPP) -> Result<Login> {
        let session = Arc::new(SqliteSession::open("./session.gram").await?);

        let SenderPool {
            runner,
            handle,
            updates: _,
        } = SenderPool::new(Arc::clone(&session), app.api_id);

        let client = Client::new(handle.clone());

        tokio::task::spawn(async move {
            runner.run().await;
        });

        if !client.is_authorized().await? {
            let token = match client.request_login_code(&app.phone, &app.api_hash).await {
                Ok(token) => token,
                _ => panic!("ERRO"),
            };

            return Ok(Login::Verification((token, client)));
        }

        let user = client.get_me().await.expect("não possivel pegar usuario");

        let store_obj = Self {
            session_path: String::from("./session.gram"),
            user: user,
            client,
            databases: Vec::new(),
        };
        let return_obj = Arc::new(tokio::sync::Mutex::new(store_obj));

        return Ok(Login::Connect(return_obj));
    }

    #[allow(unused)]
    pub async fn connect_from_session(app: TelegramAPP, sesion_path: &str) -> Result<Self> {
        let session = Arc::new(SqliteSession::open(&sesion_path).await?);

        let SenderPool {
            runner,
            handle,
            updates: _,
        } = SenderPool::new(Arc::clone(&session), app.api_id);

        let client = Client::new(handle.clone());

        tokio::task::spawn(async move {
            runner.run().await;
        });

        if !client.is_authorized().await? {
            let token = match client.request_login_code(&app.phone, &app.api_hash).await {
                Ok(token) => token,
                _ => panic!("ERRO"),
            };

            let mut code: String = String::new();

            println!("Digite o codigo que chegou");
            io::stdin().read_line(&mut code).unwrap();

            let user: grammers_client::peer::User =
                client.sign_in(&token, &code.trim()).await.unwrap();

            return Ok(Self {
                session_path: String::from("./session.gram"),
                user: user,
                client,
                databases: Vec::new(),
            });
        }

        let user = client.get_me().await.expect("não possivel pegar usuario");

        Ok(Self {
            session_path: String::from(sesion_path),
            user: user,
            client,
            databases: Vec::new(),
        })
    }

    pub async fn create_db(&mut self, name: &str) -> std::result::Result<(), InvocationError> {
        // match File::search_base(name.to_string()) {
        //     SearchResult::Ok(value) => {
        //         let (peer, access_hash) = value;

        //         let input = InputChannel {
        //             channel_id: peer,
        //             access_hash,
        //         };

        //         let get = tl::functions::channels::GetChannels {
        //             id: vec![input.into()], // Into<enums::InputChannel>
        //         };

        //         let chats = self.client.invoke(&get).await.unwrap();

        //         for chat in chats.chats() {
        //             match chat {
        //                 tl::enums::Chat::Channel(c) => {
        //                     if c.id == peer {
        //                         let mut database = Database::default();

        //                         database.set_channel(c);
        //                         self.databases.push(database);
        //                     }
        //                 }
        //                 _ => {}
        //             }
        //         }

        //         return Ok(());
        //     }
        //     _ => {}
        // };

        if Database::exist(name.to_string(), &self.client).await {
            return Ok(());
        }

        if self.client.is_authorized().await? {
            let request = tl::functions::channels::CreateChannel {
                broadcast: false,
                megagroup: false,
                forum: true,
                for_import: false,
                title: name.to_string(),
                about: "database".to_string(),
                geo_point: None,
                address: None,
                ttl_period: None,
            };

            let result = self.client.invoke(&request).await;

            if result.is_err() {
                let err = result.err().unwrap();
                eprintln!("{}", err);
                return Err(err);
            }

            let updates = result.unwrap();

            match updates {
                tl::enums::Updates::Updates(u) => {
                    for chat in &u.chats {
                        match chat {
                            tl::enums::Chat::Channel(c) => {
                                let mut database = Database::default();

                                database.set_channel(c.clone());
                                let _ = &self.databases.push(database);

                                File::insert_base(
                                    name.to_string(),
                                    c.id.to_string(),
                                    c.access_hash.unwrap().to_string(),
                                );
                            }
                            _ => eprintln!("ERRO AO MATCH u.chats"),
                        }
                    }
                }
                _ => print!("ERRO AO MATCH updates"),
            }

            return Ok(());
        };

        Ok(())
    }

    pub async fn get(&self, from_base: String) {
        let mut current_database_index: usize = 0;
        //let mut db_exist: bool = false;

        for (idx, database) in self.databases.iter().enumerate() {
            if database
                .get_database_name()
                .unwrap_or_default()
                .contains(&from_base)
            {
                current_database_index = idx;
                //db_exist = true;
                break;
            }
        }

        let (channel_id, acess_has) = match &self.databases[current_database_index].channel {
            Channel::Channel(c) => (Some(c.id), c.access_hash),
            _ => (None, None),
        };

        if channel_id.is_none() {
            println!("Channel Id não existe");
            return;
        }

        let topics = self.databases[current_database_index]
            .tables_peer
            .values()
            .map(|item| *item)
            .collect::<Vec<i32>>();

        let myi = InputPeer::Channel(InputPeerChannel {
            channel_id: channel_id.unwrap(),
            access_hash: acess_has.unwrap(),
        });

        let request = tl::functions::messages::GetForumTopicsById {
            peer: myi,
            topics: topics,
        };

        let Ok(forum_topic) = self.client.invoke(&request).await else {
            println!("NEMHUM FORUM ENCONTRADO");
            return;
        };

        match forum_topic {
            ForumTopics::Topics(c) => {
                for idx in 0..c.messages.len() {
                    let msg = match &c.messages[idx] {
                        Message::Message(m) => Some(&m.message),
                        _ => Some(&"Não tem".to_string()),
                    };

                    let topic = match &c.topics[idx] {
                        ForumTopic::Topic(to) => Some(&to.title),
                        _ => None,
                    };

                    println!(
                        "TOPIC: {}\n ------- \n MESSAGE: {}",
                        topic.unwrap(),
                        msg.unwrap()
                    );
                }
            }
        }
    }

    pub fn from_<T>() -> SelectFilters<T> {
        SelectFilters::<T>::new()
    }

    pub async fn create_table<G: StoreTableTrait>(
        this: Arc<tokio::sync::Mutex<Self>>,
        create_on_base: String,
    ) -> Option<ResultErrs> {
        let handler = tokio::task::spawn(async move {
            let mut guard = this.lock().await;
            let result = guard.telegram_create_table::<G>(create_on_base).await;
            return result;
        });

        handler.await.ok()?
    }

    async fn telegram_create_table<F: StoreTableTrait>(
        &mut self,
        base: String,
    ) -> Option<ResultErrs> {
        let mut current_database_index: usize = 0;
        let mut db_exist: bool = false;

        for (idx, database) in self.databases.iter().enumerate() {
            if database
                .get_database_name()
                .unwrap_or_default()
                .contains(&base)
            {
                current_database_index = idx;
                db_exist = true;
                break;
            }
        }

        if !db_exist {
            println!("Database do not exist");
            return Some(ResultErrs::DatabaseDoNotExist);
        }

        if self.databases[current_database_index]
            .table_exist::<F>(&self.client)
            .await
        {
            eprintln!("TABLE JA EXISTE");
            return Some(ResultErrs::TableAlreadyExist);
        };

        let fields: Vec<(Arc<str>, Arc<str>)> = F::get_filds();
        let struct_name: &str = F::get_struct();

        self.databases[current_database_index]
            .set_table_fields((Arc::from(struct_name), fields.clone()));

        if let Ok(logged) = self.client.is_authorized().await
            && !logged
        {
            eprintln!("ERRO, CLIENTE NÂO LOGADO");
            return Some(ResultErrs::ClientNotLogged);
        }

        match &self.databases[current_database_index].channel {
            Channel::IsNotSet => {
                eprintln!("ERRO, DATABASE NÂO CRIADA!");
                return Some(ResultErrs::ErrInicializeDataBase);
            }
            Channel::Channel(channel) => {
                let forum_input = tl::types::InputPeerChannel {
                    channel_id: channel.id,
                    access_hash: channel.access_hash.unwrap(),
                };

                let create_topic = grammers_tl_types::functions::messages::CreateForumTopic {
                    title_missing: false,
                    title: struct_name.to_string(),
                    icon_color: None,
                    icon_emoji_id: None,
                    random_id: rand::random::<i64>(),
                    peer: forum_input.into(),
                    send_as: None,
                };

                let result: std::result::Result<Updates, InvocationError> =
                    self.client.invoke(&create_topic).await;

                if result.is_err() {
                    let err = result.err().unwrap();
                    eprintln!("{}", err);
                    return Some(ResultErrs::ErrInvoke(err));
                }

                let enums = result.unwrap();
                match enums {
                    tl::enums::Updates::Updates(updates) => {
                        for update in updates.updates {
                            match update {
                                tl::enums::Update::NewChannelMessage(new_msg) => {
                                    match new_msg.message {
                                        tl::enums::Message::Service(service) => {
                                            match service.action {
                                                tl::enums::MessageAction::TopicCreate(_) => {
                                                    if service.from_id.is_some() {
                                                        let _ = &self.databases
                                                            [current_database_index]
                                                            .tables_peer
                                                            .insert(
                                                                Arc::from(struct_name),
                                                                service.id,
                                                            );

                                                        let fields_str = fields
                                                            .iter()
                                                            .map(|item| {
                                                                String::from(format!(
                                                                    "{}: {}",
                                                                    item.0, item.1
                                                                ))
                                                            })
                                                            .collect::<Vec<_>>()
                                                            .join(",");

                                                        File::insert_table(
                                                            struct_name.to_string(),
                                                            fields_str,
                                                            service.id.to_string(),
                                                        );
                                                    } else {
                                                        return Some(ResultErrs::TablePeerNotFound);
                                                    };
                                                }
                                                _ => {}
                                            }
                                        }
                                        _ => {}
                                    }
                                }
                                _ => {}
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        return Some(ResultErrs::Ok);
    }

    pub fn show_db_tables(
        &self,
        base: String,
    ) -> std::result::Result<Values<'_, Arc<str>, Vec<(Arc<str>, Arc<str>)>>, ResultErrs> {
        for database in &self.databases {
            if database
                .get_database_name()
                .unwrap_or_default()
                .contains(&base)
            {
                let table_names = database.tables_fields.values();
                return Ok(table_names);
            }
        }

        Err(ResultErrs::DatabaseDoNotExist)
    }

    pub async fn insert<T: StoreTableTrait + std::fmt::Display>(
        &mut self,
        value_to_insert: T,
        base_to_insert: String,
    ) -> std::result::Result<(), ResultErrs> {
        let mut current_database_index: usize = 0;
        let mut db_exist: bool = false;

        //TODO - Essas funções deveriam naa verdade, chamar Database::exist, caso não existesse em nada, ok, poderia retornar erro.
        // mas caso existesse em algum local, cloud/local ou memoria, certifica-se de criar nas outras plataformas.

        for (idx, database) in self.databases.iter().enumerate() {
            if database
                .get_database_name()
                .unwrap_or_default()
                .contains(&base_to_insert)
            {
                current_database_index = idx;
                db_exist = true;
                break;
            }
        }

        if !db_exist {
            eprintln!("DATABASE NÂO EXISTE");
            return Err(ResultErrs::DatabaseDoNotExist);
        }

        if self.databases[current_database_index]
            .table_exist::<T>(&self.client)
            .await
        {
            let table_name = T::get_struct();

            match &self.databases[current_database_index].channel {
                Channel::Channel(_) => {
                    let topic_peer = self.databases[current_database_index]
                        .tables_peer
                        .get(table_name)
                        .unwrap();

                    println!("{}", T::get_filds()[0].0);
                    let message = InputMessage::new()
                        .text(format!("{}", value_to_insert))
                        .reply_to(Some(*topic_peer));

                    println!("{}", value_to_insert);

                    match &self.databases[current_database_index].channel {
                        Channel::Channel(channel) => {
                            self.client.send_message(channel, message).await.unwrap();
                        }
                        _ => {
                            eprintln!("ERRO, CHANNEL NOT SET");
                            return Err(ResultErrs::TableDoNotExist);
                        }
                    }
                }
                _ => {
                    eprintln!("ERRO, CHANNEL NOT SET");
                    return Err(ResultErrs::TableDoNotExist);
                }
            }
        }

        Ok(())
    }
    // pub async fn send_file();
    // pub asynnc get_file()
}

pub mod macros {
    pub use crate::types::StoreTableTrait;
    pub use std::fmt;
    pub use std::sync::Arc;
    pub use store_macros::StoreTable;
}

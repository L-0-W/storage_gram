use std::{collections::hash_map::Values, io, sync::Arc};

use grammers_client::peer::Peer;
use grammers_client::{Client, InvocationError, SenderPool, message::InputMessage, peer::User};
use grammers_session::{storages::SqliteSession};
use grammers_tl_types::enums::messages::ForumTopics;
use grammers_tl_types::enums::{ForumTopic, InputPeer, Message, MessageFwdHeader};
use grammers_tl_types::types::{InputChannel, InputPeerChannel};

use crate::manager::{File, SearchResult};
use crate::types::{Channel, Database, ResultErrs, StoreTableTrait, TelegramAPP};

use grammers_tl_types::{self as tl, enums::Updates};

pub struct Store {
    #[allow(unused)]
    session_path: String,
    #[allow(unused)]
    user: User,
    client: Client,
    database: Database
}

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

impl Store {
    pub async fn connect(app: TelegramAPP) -> Result<Arc<tokio::sync::Mutex<Self>>> {
        let session = Arc::new(SqliteSession::open("./session.gram").await?);


        let SenderPool {
            runner,
            handle,
            updates: _
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

            let user: grammers_client::peer::User = client.sign_in(&token, &code.trim()).await.unwrap();
        
            let store_obj = Self { session_path: String::from("./session.gram"), user, client, database: Database::default() };
            let return_obj = Arc::new(tokio::sync::Mutex::new(store_obj));
            
            return Ok(return_obj);
        }


        let user =client.get_me().await.expect("não possivel pegar usuario");

        let store_obj = Self { session_path: String::from("./session.gram"), user, client, database: Database::default() };
        let return_obj = Arc::new(tokio::sync::Mutex::new(store_obj));
        
        return Ok(return_obj);
    }

    #[allow(unused)]
    pub async fn connect_from_session(app: TelegramAPP, sesion_path: &str) -> Result<Self> {
        let session = Arc::new(SqliteSession::open(&sesion_path).await?);


        let SenderPool {
            runner,
            handle,
            updates: _
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

            let user: grammers_client::peer::User = client.sign_in(&token, &code.trim()).await.unwrap();
        
            return Ok(Self { session_path: String::from("./session.gram"), user, client, database: Database::default() })
        }


        let user =client.get_me().await.expect("não possivel pegar usuario");

        Ok(Self { session_path: String::from(sesion_path), user, client, database: Database::default() })
    }

    pub async fn create_db(&mut self, name: &str) -> std::result::Result<(), InvocationError> {
        
        match File::search_base(name.to_string()) {
            SearchResult::Ok(value) => {
                let (peer, access_hash) = value;


                let input = InputChannel {
                    channel_id: peer,
                    access_hash
                };

                let get = tl::functions::channels::GetChannels {
                    id: vec![input.into()],  // Into<enums::InputChannel>
                };

                let chats = self.client.invoke(&get).await.unwrap();

                for chat in chats.chats() {
                    match chat {
                        tl::enums::Chat::Channel(c) => {
                            if c.id == peer {
                                self.database.channel = Channel::Channel(c);
                            }
                        }
                        _ => {}
                    }
                }


                return Ok(())
            }
            _ => {}
        };
        
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
                ttl_period: None
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
                                let _ = &self.database.set_channel(c.clone());
                                
                                File::insert_base(name.to_string(), c.id.to_string(), c.access_hash.unwrap().to_string());

                            },
                            _ => eprintln!("ERRO AO MATCH u.chats")
                        }
                    }
                },
                _ => print!("ERRO AO MATCH updates")
            }

            return Ok(())
        };

        Ok(())
    }
    
    fn table_exist<T: StoreTableTrait>(&mut self) -> bool {
        let table_to_insert = T::get_struct();

        let table_exist = &self.database.tables_fields.contains_key(table_to_insert);

        if *table_exist {
            return true;
        }    
        
        match File::search_table(table_to_insert.to_string()) {
            SearchResult::Ok(e) => {

                let (schema, peer) = e;

                let schema: std::str::Split<'_, &str> = schema.trim().split(",");

                let mut vec_items:Vec<(Arc<str>, Arc<str>)> = Vec::new();

                for item in schema {
                    let (name, ttype) = item.split_once(":").unwrap();
                    vec_items.push((Arc::from(name), Arc::from(ttype)));
                }

                self.database.tables_fields.insert(Arc::from(table_to_insert), vec_items);
                self.database.tables_peer.insert(Arc::from(table_to_insert), peer.parse::<i32>().unwrap());
                return true;
            }
            _ => {return false}
        }

    }

    pub async fn get(&self) {
        let (channel_id, acess_has) = match &self.database.channel {
            Channel::Channel(c) => {
                (Some(c.id), c.access_hash)
            }
            _ => { (None, None) }
        };
        
        let topics = self.database.tables_peer.values()
            .map(|item| *item)
            .collect::<Vec<i32>>();
        
        let myi = InputPeer::Channel(InputPeerChannel{
            channel_id: channel_id.unwrap(),
            access_hash: acess_has.unwrap()
        });
        
        let request= tl::functions::messages::GetForumTopicsById {
            peer: myi,
            topics: topics
        };
        
        let abc = self.client.invoke(&request).await.unwrap();
        
        match abc {
            ForumTopics::Topics(c) => {
                for idx in 0..c.messages.len() {
                    let msg = match &c.messages[idx] {
                        Message::Message(m) => {
                            Some(&m.message)
                        }
                        _ => { Some(&"Não tem".to_string() ) }
                    };

                    let topic = match &c.topics[idx] {
                        ForumTopic::Topic(to) => {
                            Some(&to.title)
                        }
                        _ => { None }
                    };

                    println!("TOPIC: {}\n ------- \n MESSAGE: {}", topic.unwrap(), msg.unwrap());
                }
                
            },
        }
    }

    pub async fn create_table<G: StoreTableTrait>(this: Arc<tokio::sync::Mutex<Self>>) -> Option<ResultErrs> {
        let handler = tokio::task::spawn(async move {
            let mut guard = this.lock().await;
            let result = guard.telegram_create_table::<G>().await;
            return result
        });

        handler.await.ok()?
    }
    
    async fn telegram_create_table<F: StoreTableTrait>(&mut self) -> Option<ResultErrs> {
        
        if self.table_exist::<F>() {
            eprintln!("TABLE JA EXISTE");
            return Some(ResultErrs::TableAlreadyExist);
        }


        let fields: Vec<(Arc<str>, Arc<str>)> = F::get_filds();
        let struct_name: &str = F::get_struct();

        let _ = &self.database.set_table_fields((Arc::from(struct_name), fields.clone()));

        if let Ok(logged) = self.client.is_authorized().await && !logged {
            eprintln!("ERRO, CLIENTE NÂO LOGADO");
            return Some(ResultErrs::ClientNotLogged);
        }

        match &self.database.channel {
            Channel::IsNotSet => {
                eprintln!("ERRO, DATABASE NÂO CRIADA!");
                return Some(ResultErrs::ErrInicializeDataBase);
            }
            Channel::Channel(channel) => {
                let forum_input = tl::types::InputPeerChannel{
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
                    send_as: None
                };
                
                
                let result: std::result::Result<Updates, InvocationError> = self.client.invoke(&create_topic).await;
                

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
                                            match  service.action {
                                                tl::enums::MessageAction::TopicCreate(_) => {
                                                    if service.from_id.is_some() {
                                                        let _ = &self.database.tables_peer.insert(Arc::from(struct_name), service.id);
                                                    
                                                        let fields_str = fields.iter()
                                                            .map(|item| {
                                                                String::from(format!("{}: {}", item.0, item.1))
                                                            }).collect::<Vec<_>>().join(",");

                                                        File::insert_table(struct_name.to_string(), fields_str, service.id.to_string());
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


    pub fn show_db_tables(&self) -> Values<'_, Arc<str>, Vec<(Arc<str>, Arc<str>)>> {
        let table_names = self.database.tables_fields.values();
        table_names
    }

    pub async fn insert<T: StoreTableTrait + std::fmt::Display>(&mut self, value_to_insert: T) {
       if self.table_exist::<T>() {

            let table_name = T::get_struct();

            match &self.database.channel {
                Channel::Channel(_) => {
                    let topic_peer = self.database.tables_peer.get(table_name).unwrap();

                    println!("{}", T::get_filds()[0].0);
                    let message = InputMessage::new()
                        .text(format!("{}", value_to_insert))
                        .reply_to(Some(*topic_peer));

                    println!("{}", value_to_insert);
                    
                    match &self.database.channel {
                        Channel::Channel(channel) => {
                            self.client.send_message(channel, message).await.unwrap();
                        }
                        _ => {}
                    }

       
                }
                _ => eprintln!("ERRO, CHANNEL NOT SET")
            }
       }

    }
   // pub async fn send_file();
   // pub asynnc get_file()
}


pub mod  macros {
    pub use std::fmt;
    pub use std::sync::Arc;
    pub use crate::types::StoreTableTrait;
    pub use store_macros::StoreTable;
    
}
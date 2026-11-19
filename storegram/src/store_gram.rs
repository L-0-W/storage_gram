use std::{io, sync::Arc};

use grammers_client::client::LoginToken;
//use grammers_client::peer::Peer;
use grammers_client::{Client, InvocationError, SenderPool, message::InputMessage, peer::User};
use grammers_session::storages::SqliteSession;
use grammers_tl_types::enums::{ForumTopic, Message};

use crate::telegram::TelegramUtils;
use crate::types::{
    Channel, Database, ExistResult, Login, Result, ResultErrs, SelectFilters, StoragramErros, StoreTableTrait, Table, Tables, TelegramAPP,
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
        
        return Ok(Login::Connected(return_obj));
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
    
    async fn create_db_cloud(&mut self, name: &str) -> std::result::Result<(), StoragramErros> {
        if self.client.is_authorized().await.unwrap_or(false) {
            
            let ch = TelegramUtils::create_forum(&self.client, name).await?;
            TelegramUtils::create_topic(&ch, &self.client, "schema").await?;
            
            return Ok(())
        }
        
        Err(StoragramErros::default(ResultErrs::ClientNotLogged,  line!().to_string(), file!().to_string()))
    }
    
    async fn create_db_memory(&mut self, name: &str) -> std::result::Result<(), StoragramErros> {
        
        
        let channels = Database::get_databases(&self.client).await;
        
        
        for channel in channels.unwrap_or_default() {
            let mut database = Database::default();
            database.set_channel(channel); 
            database.set_name(name.to_string());           
            self.databases.push(database);
        }
        
        // let res_databases = File::get_databases();
        // let res_tables = File::get_tables();
        
        // let mut database  = Database::default();
        
        // match  res_databases {
        //     SearchResult::Ok(local_databases) => {
        
        //         for local_database in local_databases {
        //             let i_acess_hash = local_database.2.parse::<i64>().unwrap_or_default();
        //             let i_channel_id = local_database.1.parse::<i64>().unwrap_or_default();
        
        //             let res = TelegramUtils::get_forum_by_keys(&self.client, i_acess_hash, i_channel_id).await;
        
        //             if res.is_err() { return Err(InvocationError::InvalidDc) }
        
        //             let channel = res.unwrap();
        //             database.set_channel(channel);
        //         }
        //     }
        //     _ => {}
        // }
        
        // match res_tables {
        //     SearchResult::Ok(local_tables) => {
        //         for local_table in local_tables {
        //             //database.set_table_fields(local_table.0, vec![local_table.]);
        //         }
        //     }
        //     _ => {}
        // }
        
        return  Ok(());
    }
    
    async fn create_table_cloud(&self, tables: &Tables, database: usize) -> std::result::Result<(), StoragramErros> {
        let topics_to_create = tables.get_database_tables();
        
        let channel = match &self.databases[database].channel {
            Channel::Channel(c) => c,
            _ => return Err(StoragramErros::default(ResultErrs::DatabaseDoNotExist, line!().to_string(), file!().to_string())),
        };
        
        for topic_to_create in topics_to_create {            
            TelegramUtils::create_topic(channel, &self.client, &topic_to_create.0).await?
        }
        
        return Ok(())
    }
    
    async fn create_table_memory(&mut self, topics: Vec<ForumTopic>, database: usize) {
        for topic in &topics {
            if let tl::enums::ForumTopic::Topic(t) = topic {
                if let tl::enums::Peer::Channel(peer) = &t.peer {
                    if !t.title.eq("General"){
                        let _ =&self.databases[database].tables.insert_table(peer.channel_id as i32, Arc::from(t.title.as_str()));
                    }
                }
            }           
        }
    }
    
    //TODO - 'create_db_cloud' deveria apenas fazer a criação no cloud, sem chamar File::insert_db, isso deveira acontecer aqui em create_db
    // para que faça sentindo, em ::False a chamada de 'create_db_cloud' e 'create_db_local'
    pub async fn create_db(&mut self, name: &str) -> std::result::Result<(), StoragramErros> {
        
        match Database::exist(&self.databases, &name.to_string(), &self.client).await {
            ExistResult::CloudOnly => { let _ =self.create_db_memory(name).await.map_err(|err| return err); },
            ExistResult::MemoryOnly => { let _ =self.create_db_cloud(name).await.map_err(|err| return err); },
            ExistResult::True => { println!("DATABASE ALREADY EXIST") },
            ExistResult::False => {
                println!("CREATING DATABASE");
                let _ = self.create_db_cloud(name).await?;
                let _ = self.create_db_memory(name).await?; 
                
                return Ok(());
            }
        }
        
        
        let Some((us, database))= self.databases.iter().enumerate().find_map(|(us, db)| if db.get_database_name().eq(name) { return Some((us, db)) } else { None }) else {
            return Ok(());
        };
        
        
        match Tables::exist(database, &self.client).await {
            ExistResult::CloudOnly => { 
                println!("[create_db] - [Tables::exist] - CREATING IN MEMORY");
                self.create_table_memory(Tables::get_cloud(database, &self.client).await, us).await
            }
            ExistResult::MemoryOnly => {
                println!("[create_db] - [Tables::exist] - CREATING IN CLOUD");
                let tables = Tables::get_memory(database).await;
                let _ =self.create_table_cloud(tables, us).await.map_err(|err| return err);
            }
            ExistResult::False => {
                println!("[create_db] - [Tables::exist] - DO NOT EXIST");

            }
            ExistResult::True => {
               println!("[create_db] - [Tables::exist] - ALREADY EXIST");
            }
        }
        
        return Ok(())
        // match Table::exist
    }
    
    pub async fn get(&self, from_base: String) {
        let mut current_database_index: usize = 0;
        //let mut db_exist: bool = false;
        
        for (idx, database) in self.databases.iter().enumerate() {
            if database
            .get_database_name()
            .eq(&from_base)
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
        
        let topics = self.databases[current_database_index].tables.get_forums_peer();
        
        let Ok(returned_topics) =TelegramUtils::get_forum_topics_by_id(topics, channel_id.unwrap(), acess_has.unwrap(), &self.client).await else { return };              
        
        
        for idx in 0..returned_topics.messages.len() {
            let msg = match &&returned_topics.messages[idx] {
                Message::Message(m) => Some(&m.message),
                _ => Some(&"Não tem".to_string()),
            };
            
            let topic = match &&returned_topics.topics[idx] {
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
    
    pub fn from_<T>() -> SelectFilters<T> {
        SelectFilters::<T>::new()
    }
    
    pub async fn create_table<G: StoreTableTrait>(
        this: Arc<tokio::sync::Mutex<Self>>,
        create_on_base: String,
    ) -> std::result::Result<std::result::Result<(), StoragramErros>, StoragramErros> {
        let handler = tokio::task::spawn(async move {
            let mut guard = this.lock().await;
            let result = guard.telegram_create_table::<G>(create_on_base).await;
            return result;
        });
        
        let res = handler.await;
        
        if res.is_err() { return Err(StoragramErros::default(ResultErrs::JoinHandle, line!().to_string(), file!().to_string())) }
        Ok(res.unwrap())
    }
    
    async fn telegram_create_table<F: StoreTableTrait>(
        &mut self,
        base: String,
    ) -> std::result::Result<(), StoragramErros> {
        
        
        match Database::exist(&self.databases, &base.to_string(), &self.client).await {
            ExistResult::CloudOnly => { return self.create_db_memory(&base).await.map_err(|err| return err) },
            ExistResult::MemoryOnly => { return self.create_db_cloud(&base).await.map_err(|err| return err) },
            ExistResult::False => {
                println!("DATABASE NÂO EXISTE"); 
                return Err(StoragramErros::default(ResultErrs::DatabaseDoNotExist, line!().to_string(), file!().to_string()));
            }
            ExistResult::True => {},
        };
        
        
        let mut current_database_index: usize = 0;
        
        
        for (idx, database) in self.databases.iter().enumerate() {
            if database
            .get_database_name()
            .eq(&base)
            {
                current_database_index = idx;
                break;
            }
        }
        
        match Table::exist::<F>(&self.databases[current_database_index], &self.client).await {
            ExistResult::CloudOnly => { 
                println!("[telegram_create_table] - [Table::exist] - CREATING IN MEMORY");
                let target_name = self.databases[current_database_index].get_database_name();
                let topics =TelegramUtils::get_forum_topics(target_name, &self.client).await.unwrap();
                let result = topics.iter().find_map(|topic| {
                    let Some((peer, name)) = TelegramUtils::get_peer_name_from_topic(topic) else {return None};
                    
                    if name.eq(F::get_struct()) { return Some((peer, name)) } else { return None; }
                });

                let topic = result.unwrap();
                let _ =&self.databases[current_database_index].tables.insert_table(topic.0 as i32, Arc::from(topic.1.as_str()));
            }
            ExistResult::MemoryOnly => {
                println!("[telegram_create_table] - [Table::exist] - CREATING IN CLOUD");
                let tables = &self.databases[current_database_index].tables;
                let _ =self.create_table_cloud(tables, current_database_index).await.map_err(|err| return err);
            }
            ExistResult::False => {
                println!("[telegram_create_table] - [Table::exist] - DO NOT EXIST");

            }
            ExistResult::True => {
                println!("[telegram_create_table] - [Table::exist] - ALREADY EXIST");
                return Err(StoragramErros::default(ResultErrs::TableAlreadyExist, line!().to_string(), file!().to_string()));
            }
        } 
        
        
        let fields: Vec<(Arc<str>, Arc<str>)> = F::get_filds();
        let struct_name: &str = F::get_struct();
        
        let _ = self.databases[current_database_index]
        .set_table_fields((Arc::from(struct_name), fields.clone()));
        
        if let Ok(logged) = self.client.is_authorized().await
        && !logged
        {
            eprintln!("ERRO, CLIENTE NÂO LOGADO");
            return Err(StoragramErros::default(ResultErrs::ClientNotLogged, line!().to_string(), file!().to_string()));
        }
        
        match &self.databases[current_database_index].channel {
            Channel::IsNotSet => {
                eprintln!("ERRO, DATABASE NÂO CRIADA!");
                return Err(StoragramErros::default(ResultErrs::ErrInicializeDataBase, line!().to_string(), file!().to_string()));
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
                    return Err(StoragramErros::default(ResultErrs::ErrInvoke(err), line!().to_string(), file!().to_string()));
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
                                                        [current_database_index].tables.insert_table(service.id, Arc::from(struct_name));
                                                        
                                                        
                                                        // let fields_str = fields
                                                        // .iter()
                                                        // .map(|item| {
                                                        //     String::from(format!(
                                                        //         "{}: {}",
                                                        //         item.0, item.1
                                                        //     ))
                                                        // })
                                                        // .collect::<Vec<_>>()
                                                        // .join(",");
                                                        
                                                        // File::insert_table(
                                                        //     struct_name.to_string(),
                                                        //     fields_str,
                                                        //     service.id.to_string(),
                                                        // );
                                                    } else {
                                                        return Err(StoragramErros::default(ResultErrs::TablePeerNotFound, line!().to_string(), file!().to_string()));
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
        
        return Err(StoragramErros::default(ResultErrs::Ok, line!().to_string(), file!().to_string()));
    }
    
    pub fn show_db_tables(
        &self,
        base: String,
    ) -> std::result::Result<Vec<(Arc<str>, Vec<[Arc<str>; 2]>)>, ResultErrs> {
        for database in &self.databases {
            if database
            .get_database_name()
            .contains(&base)
            {
                let table_names = database.tables.get_database_tables();
                return Ok(table_names);
            }
        }
        
        Err(ResultErrs::DatabaseDoNotExist)
    }
    
    pub async fn insert<T: StoreTableTrait + std::fmt::Display>(
        &mut self,
        value_to_insert: T,
        base_to_insert: String,
    ) -> std::result::Result<(), StoragramErros> {
        
        
        match Database::exist(&self.databases, &base_to_insert.to_string(), &self.client).await {
            ExistResult::CloudOnly => { return self.create_db_memory(&base_to_insert).await.map_err(|err| return err) },
            ExistResult::MemoryOnly => { return self.create_db_cloud(&base_to_insert).await.map_err(|err| return err) },
            ExistResult::False => {
                println!("DATABASE NÂO EXISTE"); 
                return Err(StoragramErros::default(ResultErrs::DatabaseDoNotExist, line!().to_string(), file!().to_string()));
            }
            ExistResult::True => {},
        };
        
        let mut current_database_index: usize = 0;
        
        
        for (idx, database) in self.databases.iter().enumerate() {
            if database
            .get_database_name()
            .eq(&base_to_insert)
            {
                current_database_index = idx;
                break;
            }
        }
        
        
        if self.databases[current_database_index]
        .table_exist::<T>(&self.client)
        .await
        {
            let table_name = T::get_struct();
            
            match &self.databases[current_database_index].channel {
                Channel::Channel(_) => {
                    let topic_peer = self.databases[current_database_index].tables.get_table_by_name(table_name).map_or_default(|t| t.get_peer());
                    
                    
                    println!("{}", T::get_filds()[0].0);
                    let message = InputMessage::new()
                    .text(format!("{}", value_to_insert))
                    .reply_to(Some(topic_peer));
                    
                    println!("{}", value_to_insert);
                    
                    match &self.databases[current_database_index].channel {
                        Channel::Channel(channel) => {
                            self.client.send_message(channel, message).await.unwrap();
                        }
                        _ => {
                            eprintln!("ERRO, CHANNEL NOT SET");
                            return Err(StoragramErros::default(ResultErrs::TableDoNotExist, line!().to_string(), file!().to_string()));
                        }
                    }
                }
                _ => {
                    eprintln!("ERRO, CHANNEL NOT SET");
                    return Err(StoragramErros::default(ResultErrs::TableDoNotExist, line!().to_string(), file!().to_string()));
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
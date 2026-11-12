use grammers_client::{Client, InvocationError, client::LoginToken};
use grammers_tl_types::{
    self as tl,
    enums::{ForumTopic, InputPeer, messages::ForumTopics},
    types::InputPeerChannel,
};
use std::sync::Arc;

use crate::{
    store_gram::{self}, telegram::TelegramUtils,
};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

pub struct TelegramAPP {
    pub api_hash: String,
    pub api_id: i32,
    pub phone: String,
}

impl TelegramAPP {
    pub fn new(api_hash: &str, api_id: i32, phone: &str) -> Self {
        Self {
            api_hash: api_hash.to_string(),
            api_id,
            phone: phone.to_string(),
        }
    }
}

//type TableFields = Vec<(&'static str, Vec<(&'static str, &'static str)>)>;
type TableFields = std::collections::HashMap<Arc<str>, Vec<(Arc<str>, Arc<str>)>>;
type TablePeer = std::collections::HashMap<Arc<str>, i32>;

pub enum Login {
    Verification((LoginToken, Client)),
    Connected(Arc<tokio::sync::Mutex<store_gram::Store>>),
}

pub struct SelectFilters<T> {
    fields: Vec<String>,
    where_function: Option<fn(T) -> bool>,
}


impl<T> SelectFilters<T> {
    pub fn new() -> Self {
        Self {
            fields: vec![],
            where_function: None,
        }
    }
    pub fn select<G, S>(&mut self, fields: G) -> &mut Self
    where
        G: IntoIterator<Item = S>,
        S: AsRef<str>,
    {
        for field in fields {
            let field_str = field.as_ref();

            self.fields.push(field_str.to_string());
        }

        self
    }

    pub fn where_(&mut self, where_function: fn(T) -> bool) -> &Self {
        self.where_function = Some(where_function);
        self
    }

    pub fn run(&self) {
        println!("Terminou")
    }
}


pub enum Channel {
    Channel(tl::types::Channel),
    IsNotSet,
}

pub trait DatabaseLocations {
    fn is_true (&self)  -> bool;
}

pub struct Cloud(bool);
impl DatabaseLocations for Cloud {
    fn is_true (&self)  -> bool { self.0 }
}

pub struct Local(bool);
impl DatabaseLocations for Local {
    fn is_true (&self)  -> bool { self.0 }
}

pub struct Memory(bool);
impl DatabaseLocations for Memory {
    fn is_true (&self)  -> bool { self.0 }
}


pub enum DatabaseExistResult {
    CloudOnly,
    MemoryOnly,
    True,
    False
}

pub struct Database {
    pub channel: Channel,
    pub tables_fields: TableFields,
    pub tables_peer: TablePeer,
}


impl Database {
    #[allow(unused)]
    pub fn new(channel: Channel, tables_fields: TableFields, tables_peer: TablePeer) -> Self {
        Self {
            channel,
            tables_fields,
            tables_peer,
        }
    }

    pub fn set_channel(&mut self, channel: tl::types::Channel) {
        self.channel = Channel::Channel(channel);
    }

    pub fn get_database_name(&self) -> std::result::Result<String, ()> {
        match &self.channel {
            Channel::Channel(c) => return Ok(c.title.to_string()),
            _ => Err(()),
        }
    }

    pub async fn get_databases(client: &Client) -> std::result::Result<Vec<tl::types::Channel>, ResultErrs> {
        let databases_res = TelegramUtils::get_forums(client).await;

        if databases_res.is_err() { return Err(ResultErrs::ErrInvoke(InvocationError::InvalidDc)) }

        let databases = databases_res.unwrap();
        if databases.is_empty() { return Err(ResultErrs::NoDatabasesInTheCloud) }


        println!("A");
        return Ok(databases)
    }

    pub fn set_table_fields(&mut self, table_fields: (Arc<str>, Vec<(Arc<str>, Arc<str>)>)) {
        let _ = &self.tables_fields.insert(table_fields.0, table_fields.1);
    }

    async fn talbe_exist_in_cloud(&self, client: &Client, table: String) -> bool {
        let (channel_id, acess_has) = match &self.channel {
            Channel::Channel(c) => (Some(c.id), c.access_hash),
            _ => (None, None),
        };

        let topics = self
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

        if let Ok(forum_topic) = client.invoke(&request).await {
            match forum_topic {
                ForumTopics::Topics(c) => {
                    for idx in 0..c.messages.len() {
                        let topic = match &c.topics[idx] {
                            ForumTopic::Topic(to) => Some(&to.title),
                            _ => None,
                        };

                        if topic.unwrap().contains(&table) {
                            return true;
                        }
                    }
                }
            }
        };

        return false;
    }

    pub async fn table_exist<T: StoreTableTrait>(&self, client: &Client) -> bool {
        let table_to_check = T::get_struct();

        let result_in_memory = self.tables_fields.contains_key(table_to_check);

        // let result_in_local_file = match File::search_table(table_to_check) {
        //     SearchResult::Ok(_) => true,
        //     _ => false,
        // };

        let result_in_cloud = self
            .talbe_exist_in_cloud(client, table_to_check.to_string())
            .await;

        if result_in_memory  || result_in_cloud {
            true
        } else {
            false
        }
    }

    async fn exist_cloud(database_name: &String, client: &Client) -> Result<bool> {
        let mut dialogs = client.iter_dialogs();

        while let Some(dialog) = dialogs.next().await? {
            let peer = dialog.peer();

            if peer.name().unwrap_or_default() == database_name {
                return Ok(true);
            }
        }

        Ok(false)
    }

    fn exist_memory(databases: &[Database], database_name: &String) -> Result<bool> {

        for database in databases {
           if database.get_database_name().unwrap_or_default().eq(database_name) {
                return Ok(true);
           }
        };

        Ok(false)
    }
    pub async fn exist(databases: &[Database], database_name: &String, client: &Client) -> DatabaseExistResult {
        // let result_in_local_file = match File::search_base(database_name) {
        //     SearchResult::Ok(_) => true,
        //     _ => false,
        // };

        let result_in_cloud = Database::exist_cloud(&database_name, client)
            .await
            .unwrap_or(false);

        let result_in_memory = Database::exist_memory(databases, database_name).unwrap_or(false);
        
        if !result_in_cloud && !result_in_memory {
            return DatabaseExistResult::False;
        }

        if !result_in_cloud {
            return DatabaseExistResult::MemoryOnly;
        }

        if !result_in_memory {
            return DatabaseExistResult::CloudOnly
        }

        return DatabaseExistResult::True
    }
}

impl Default for Database {
    fn default() -> Self {
        Self {
            channel: Channel::IsNotSet,
            tables_fields: std::collections::HashMap::new(),
            tables_peer: std::collections::HashMap::new(),
        }
    }
}

pub trait StoreTableTrait {
    fn get_filds() -> Vec<(Arc<str>, Arc<str>)>;
    fn get_struct() -> &'static str;
}

#[derive(Debug)]
pub enum ResultErrs {
    ErrInicializeDataBase,
    DatabaseAlredyExist,
    ClientNotLogged,
    #[allow(unused)]
    ErrInvoke(InvocationError),
    TableAlreadyExist,
    JoinHandle,
    DatabaseDoNotExist,
    TablePeerNotFound,
    TableDoNotExist,
    ErrMatcingUpdateInDatabaseCreation,
    NoDatabasesInTheCloud,
    Ok,
}

pub struct StoragramErros {
    err: ResultErrs,
    line: String,
    file: String,    
}

impl  StoragramErros {
    pub fn default(err: ResultErrs, line: String, file: String) -> Self {
        Self { err: err, line, file }
    } 

    pub fn get_error(&self) {
        println!("{:?}  - Line: {}  - File: {}", self.err, self.line, self.file)
    } 
}


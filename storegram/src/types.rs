use grammers_client::{Client, InvocationError, client::LoginToken};
use grammers_tl_types::{self as tl};
use std::sync::Arc;

use crate::store_gram;

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
    Connect(Arc<tokio::sync::Mutex<store_gram::Store>>),
}

pub struct SelectFilters<T> {
    pub table: T,
}

impl<T> SelectFilters<T> {
    pub fn _where() {
        todo!()
    }
}

pub enum Channel {
    Channel(tl::types::Channel),
    IsNotSet,
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

    pub fn set_table_fields(&mut self, table_fields: (Arc<str>, Vec<(Arc<str>, Arc<str>)>)) {
        let _ = &self.tables_fields.insert(table_fields.0, table_fields.1);
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

pub enum ResultErrs {
    ErrInicializeDataBase,
    ClientNotLogged,
    #[allow(unused)]
    ErrInvoke(InvocationError),
    TableAlreadyExist,
    TablePeerNotFound,
    Ok,
}

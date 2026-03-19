use proc_macro::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, parse_macro_input};

#[proc_macro_derive(StoreTable)]
pub fn derive_store_table(input: TokenStream) -> TokenStream {

    let input = parse_macro_input!(input as DeriveInput);
    let nome = &input.ident;

    let nome_str = quote!(stringify!(#nome));

    let campos = match &input.data {
        Data::Struct(data) => match &data.fields {
            syn::Fields::Named(campos) => {
                let nomes_campos = campos.named.iter().map(|f| {
                    let nome = &f.ident;
                    let tipo = &f.ty;

                    quote! { (Arc::from(stringify!(#nome)), Arc::from(stringify!(#tipo))) }
                });
                
                quote! {
                    vec![#(#nomes_campos), *]
                }
            }
            _ => quote! { vec![] }
        }
        _ => panic!("apenas funciona em structs")
    };

    let display_fields = match &input.data {
        Data::Struct(data) => match &data.fields {
            syn::Fields::Named(campos) => {
                let nomes_campos = campos.named.iter().map(|fi| {
                    let field_nome = &fi.ident;
                    
                    quote! { 
                        write!(f, "{}: {}\n", stringify!(#field_nome), self.#field_nome)? 
                    }
                });

                quote! {
                    #(#nomes_campos;)*
                    Ok(())
                }
            },
            _ => quote! {}
        }  
        _ => panic!("Não e uma estrutura")
    };

    let expanded = quote! {
        impl fmt::Display for #nome {
            fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
                #display_fields
            }
        }

        impl StoreTableTrait for #nome {
            fn get_filds() -> Vec<(Arc<str>, Arc<str>)> {
                #campos
            }

            fn get_struct() -> &'static str {
                #nome_str
            }
        }
    };

    TokenStream::from(expanded)
}


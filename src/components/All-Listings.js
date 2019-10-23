import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import styled from "@emotion/styled";

import Listing from "./Listing";
import TrackListing from "./Track-Listing";
import { listListings } from "../graphql/queries";
import {
  createListing,
  deleteListing,
  updateListing
} from "../graphql/mutations";

import {
  onCreateListing,
  onUpdateListing,
  onDeleteListing
} from "../graphql/subscriptions";

const Container = styled("div")`
  max-width: 800px;
  margin: 16px auto;
`;

const Listings = styled("div")`
  margin-top: 24px;
`;

export default () => {
  const [listings, setListings] = useState([]);
  
  useEffect(() => {
    API.graphql(graphqlOperation(listListings))
      .then(result => {
        setListings(
          result.data.listListings.items.sort((a, b) => {
            if (a.updatedAt > b.updatedAt) return -1;
            else return 1;
          })
        );
      })
      .catch(error => {
        console.log(error);
      });
  API.graphql(graphqlOperation(onCreateListing)).subscribe({
      next: (e) => {
          setListings(prevValue => {
          console.log("Invoked onCreateListing Subcription callback " + e.value.data.onCreateListing.title);  
          let ids = new Map();
          let updatedListings = prevValue;
          updatedListings.push(e.value.data.onCreateListing);
                  updatedListings = updatedListings.filter(l => {
                  if (ids.has(l.id)) {
                    console.log("Duplicate listing found, handling it with id= " + l.id + ", title=" + l.title);
                    const dupListing = ids.get(l.id);
                    if (dupListing.updatedAt >= l.updatedAt) {
                      return false;
                    }
                    ids.delete(l.id);
                    ids.set(l.id, l);
                    return true;
                  } else {
                    ids.set(l.id, l);
                    return true;
                  }
                });
          updatedListings.sort((a, b) => {
            if (a.updatedAt > b.updatedAt) return -1;
            else return 1;
          })
            return updatedListings;
          });
      }
    });
  API.graphql(graphqlOperation(onUpdateListing)).subscribe({
      next: (e) => {
          setListings(prevValue => {
          console.log("Invoked onUpdateListing Subscription callback " + e.value.data.onUpdateListing.title);  
                const updatedListings = prevValue.map(l => {
                  if (l.id === e.value.data.onUpdateListing.id) {
                    return e.value.data.onUpdateListing;
                  }

                  return l;
                });
                return updatedListings;
          });
      }
    });
  API.graphql(graphqlOperation(onDeleteListing)).subscribe({
      next: (e) => {
          setListings(prevValue => {
          console.log("Invoked onDeleteListing Subscription callback " + e.value.data.onDeleteListing.title);  
                const updatedListings = prevValue.filter(l => {
                  return l.id !== e.value.data.onDeleteListing.id;
                });
                return updatedListings;
          });
      }
    });
  }, []);

  return (
    <Container>
      <TrackListing
        onSave={values => {
          API.graphql(
            graphqlOperation(createListing, {
              input: values
            })
          ).then(result => {
            setListings([result.data.createListing, ...listings]);
          });
        }}
      />
      <Listings>
        {listings.map(listing => (
          <Listing
            key={listing.id}
            listing={listing}
            onSaveChanges={values => {
              API.graphql(
                graphqlOperation(updateListing, {
                  input: {
                    ...listing,
                    ...values
                  }
                })
              ).then(result => {
                const updatedListings = listings.map(l => {
                  if (l.id === result.data.updateListing.id) {
                    return result.data.updateListing;
                  }

                  return l;
                });

                setListings(updatedListings);
              });
            }}
            onFavorite={() => {
              API.graphql(
                graphqlOperation(updateListing, {
                  input: {
                    ...listing,
                    favorite: !listing.favorite
                  }
                })
              ).then(result => {
                const updatedListings = listings.map(l => {
                  if (l.id === result.data.updateListing.id) {
                    return result.data.updateListing;
                  }

                  return l;
                });

                setListings(updatedListings);
              });
            }}
            onDelete={() => {
              if (window.confirm("Are you sure want to delete this listing?")) {
                API.graphql(
                  graphqlOperation(deleteListing, {
                    input: { id: listing.id }
                  })
                ).then(result => {
                  const updatedListings = listings.filter(
                    l => l.id !== result.data.deleteListing.id
                  );

                  setListings(updatedListings);
                });
              }
            }}
          />
        ))}
      </Listings>
    </Container>
  );
};
